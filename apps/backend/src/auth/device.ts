import { createHash } from "crypto";

/** Browser installation identity, never an authentication credential or an IP fingerprint. */
export function requestDevice(request: any): string | undefined {
  const value = /(?:^|;\s*)genyxo_device=([a-f0-9-]{36})(?:;|$)/i.exec(
    request?.headers?.cookie || "",
  )?.[1];
  return value ? createHash("sha256").update(value).digest("hex") : undefined;
}
