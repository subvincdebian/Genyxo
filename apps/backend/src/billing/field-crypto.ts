import { ServiceUnavailableException } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "crypto";

/**
 * Authenticated encryption (AES-256-GCM) for personal billing data at rest.
 * Key "k1" is BILLING_ENCRYPTION_KEY (32 bytes, base64 or hex). Without it,
 * key "j1" is derived from JWT_SECRET with HKDF so the feature works on every
 * host; set BILLING_ENCRYPTION_KEY in production to keep billing data
 * independent of the JWT secret. Each value records its key id.
 */
function keyFor(id: string): Buffer {
  if (id === "k1") {
    const raw = process.env.BILLING_ENCRYPTION_KEY?.trim();
    if (raw) {
      const key = /^[0-9a-f]{64}$/i.test(raw)
        ? Buffer.from(raw, "hex")
        : Buffer.from(raw, "base64");
      if (key.length === 32) return key;
    }
  }
  if (id === "j1" && process.env.JWT_SECRET)
    return Buffer.from(
      hkdfSync(
        "sha256",
        process.env.JWT_SECRET,
        "genyxo-billing",
        "billing-profile-v1",
        32,
      ),
    );
  throw new ServiceUnavailableException("Billing storage is not configured");
}

function currentKey() {
  try {
    return { id: "k1", key: keyFor("k1") };
  } catch {
    return { id: "j1", key: keyFor("j1") };
  }
}

export function seal(value: unknown, context: string) {
  const { id, key } = currentKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  // The owner id is bound as associated data: a row copied to another user fails to open.
  cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    id,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

export function open<T>(sealed: string, context: string): T {
  const [version, id, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body)
    throw new Error("Unknown billing data format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(id),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]).toString("utf8"),
  ) as T;
}
