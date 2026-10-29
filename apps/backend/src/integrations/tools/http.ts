import type { ProviderRequest } from "./types";

export class ProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 20_000;

function providerMessage(body: unknown, status: number): string {
  const data = body as Record<string, any> | null;
  const message =
    (typeof data?.error === "object" ? data?.error?.message : undefined) ||
    data?.message ||
    data?.error_description ||
    data?.error_summary ||
    (typeof data?.error === "string" ? data.error : undefined) ||
    data?.errors?.[0]?.message;
  // Provider text is shown to the model and the user, so keep it short.
  return `${status}: ${String(message || "Provider request failed").slice(0, 300)}`;
}

/** One HTTPS call to a provider API with the user's bearer token. */
export async function providerFetch<T = any>(
  token: string,
  url: string,
  init: ProviderRequest = {},
): Promise<T> {
  const target = new URL(url);
  if (target.protocol !== "https:")
    throw new Error("Provider URLs must use HTTPS");
  for (const [key, value] of Object.entries(init.query || {}))
    if (value !== undefined && value !== null && value !== "")
      target.searchParams.set(key, String(value));
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Genyxo-Integrations",
    ...(init.noAuth ? {} : { Authorization: `Bearer ${token}` }),
    ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
    ...init.headers,
  };
  const response = await fetch(target, {
    method:
      init.method || (init.json !== undefined || init.body ? "POST" : "GET"),
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const raw = await response.text();
  if (!response.ok) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { message: raw.slice(0, 200) };
    }
    throw new ProviderError(
      response.status,
      providerMessage(parsed, response.status),
    );
  }
  if (init.text) return raw as T;
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}
