import { ServiceUnavailableException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/** AES-256-GCM with a 32-byte hex key: "v1.<iv>.<tag>.<ciphertext>" in base64. */
export class TokenCipher {
  private readonly key: Buffer | null;

  constructor(hexKey: string | undefined) {
    this.key =
      hexKey && /^[a-f\d]{64}$/i.test(hexKey)
        ? Buffer.from(hexKey, "hex")
        : null;
  }

  get available() {
    return this.key !== null;
  }

  private requireKey(): Buffer {
    if (!this.key)
      throw new ServiceUnavailableException(
        "Plugin connections require INTEGRATIONS_ENCRYPTION_KEY (32 bytes in hex)",
      );
    return this.key;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.requireKey(), iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return ["v1", iv, cipher.getAuthTag(), data]
      .map((part) =>
        typeof part === "string" ? part : part.toString("base64url"),
      )
      .join(".");
  }

  decrypt(sealed: string): string {
    const [version, iv, tag, data] = sealed.split(".");
    if (version !== "v1" || !iv || !tag || data === undefined)
      throw new Error("Unsupported ciphertext");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.requireKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
