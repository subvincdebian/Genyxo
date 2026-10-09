/** Public Next.js address, separate from SITE_URL used by API webhooks. */
export function frontendUrl(path = "/"): URL {
  const base = new URL(process.env.FRONTEND_URL || "https://genyxo.com");
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error(
      "FRONTEND_URL must be an HTTP(S) URL without credentials, query or fragment",
    );
  }
  return new URL(path, base);
}
