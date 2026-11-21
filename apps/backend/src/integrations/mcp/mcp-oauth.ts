/**
 * OAuth discovery for remote MCP servers (RFC 9728 protected-resource
 * metadata → RFC 8414 authorization-server metadata) and dynamic client
 * registration (RFC 7591).
 */
export interface McpAuthServer {
  resource: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  revocationEndpoint?: string;
  scopes: string[];
}
export interface RegisteredClient {
  clientId: string;
  clientSecret?: string;
  authMethod: string;
}

async function getJson(url: string): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function wellKnown(base: string, kind: string): string[] {
  const url = new URL(base);
  const path = url.pathname.replace(/\/$/, "");
  const candidates = [
    `${url.origin}/.well-known/${kind}${path}`,
    `${url.origin}${path}/.well-known/${kind}`,
    `${url.origin}/.well-known/${kind}`,
  ];
  return [...new Set(candidates)];
}

export function parseChallenge(header: string | null) {
  return {
    resourceMetadata: header?.match(/resource_metadata="([^"]+)"/)?.[1],
    scope: header?.match(/scope="([^"]+)"/)?.[1],
  };
}

/** Finds where to authorize for a server URL, starting from its 401 challenge. */
export async function discoverAuthServer(
  serverUrl: string,
): Promise<McpAuthServer & { challengeScope?: string }> {
  let challenge: string | null = null;
  try {
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "Genyxo", version: "1.0.0" },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    challenge = response.headers.get("www-authenticate");
    await response.body?.cancel();
  } catch {
    // Fall back to well-known locations.
  }
  const { resourceMetadata, scope } = parseChallenge(challenge);
  let resourceMeta = resourceMetadata ? await getJson(resourceMetadata) : null;
  for (const candidate of resourceMeta
    ? []
    : wellKnown(serverUrl, "oauth-protected-resource")) {
    resourceMeta = await getJson(candidate);
    if (resourceMeta) break;
  }
  const issuer = String(
    resourceMeta?.authorization_servers?.[0] || new URL(serverUrl).origin,
  );
  let server: Record<string, any> | null = null;
  for (const kind of ["oauth-authorization-server", "openid-configuration"]) {
    for (const candidate of wellKnown(issuer, kind)) {
      server = await getJson(candidate);
      if (server?.authorization_endpoint) break;
      server = null;
    }
    if (server) break;
  }
  if (!server?.authorization_endpoint || !server?.token_endpoint)
    throw new Error("This MCP server does not publish OAuth metadata");
  const httpsOnly = (value: unknown) =>
    typeof value === "string" && value.startsWith("https://")
      ? value
      : undefined;
  return {
    resource: String(resourceMeta?.resource || serverUrl),
    issuer,
    authorizationEndpoint: httpsOnly(server.authorization_endpoint)!,
    tokenEndpoint: httpsOnly(server.token_endpoint)!,
    registrationEndpoint: httpsOnly(server.registration_endpoint),
    revocationEndpoint: httpsOnly(server.revocation_endpoint),
    scopes: Array.isArray(resourceMeta?.scopes_supported)
      ? resourceMeta.scopes_supported.map(String)
      : [],
    challengeScope: scope,
  };
}

/** Registers Genyxo as a public OAuth client for one redirect URI. */
export async function registerClient(
  server: McpAuthServer,
  redirectUri: string,
  scope?: string,
): Promise<RegisteredClient> {
  if (!server.registrationEndpoint)
    throw new Error(
      "This MCP server does not allow automatic client registration",
    );
  const response = await fetch(server.registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_name: "Genyxo",
      client_uri: new URL(redirectUri).origin,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      ...(scope ? { scope } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok || !data.client_id)
    throw new Error(`Client registration failed (${response.status})`);
  return {
    clientId: String(data.client_id),
    clientSecret: data.client_secret ? String(data.client_secret) : undefined,
    authMethod: String(
      data.token_endpoint_auth_method ||
        (data.client_secret ? "client_secret_post" : "none"),
    ),
  };
}
