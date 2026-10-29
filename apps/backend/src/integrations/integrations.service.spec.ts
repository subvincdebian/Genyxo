import { ConfigService } from "@nestjs/config";
import { IntegrationsService } from "./integrations.service";
import { IntegrationConnection } from "./integration-connection.entity";
import { IntegrationClient } from "./integration-client.entity";
import { memoryRepository } from "./memory-repository.test-spec";
import { resetMcpSessions } from "./mcp/mcp-client";

const KEY = "a".repeat(64);

function setup(env: Record<string, string> = {}) {
  const values: Record<string, string> = {
    INTEGRATIONS_ENCRYPTION_KEY: KEY,
    FRONTEND_URL: "http://localhost:3001",
    GITHUB_INTEGRATION_CLIENT_ID: "gh-client",
    GITHUB_INTEGRATION_CLIENT_SECRET: "gh-secret",
    ...env,
  };
  const config = {
    get: (name: string) => values[name],
  } as unknown as ConfigService;
  const repo = memoryRepository<IntegrationConnection>();
  const clients = memoryRepository<IntegrationClient>();
  const service = new IntegrationsService(config, repo as any, clients as any);
  return { service, repo, clients };
}

/** Routes fetch calls to a handler; a returned Response is used as is. */
function mockFetch(handler: (url: string, init: RequestInit) => unknown) {
  return jest
    .spyOn(global, "fetch")
    .mockImplementation(async (input: any, init: any = {}) => {
      const url = String(input instanceof URL ? input.href : input);
      const body = handler(url, init);
      if (body instanceof Response) return body;
      const status = (body as any)?.__status || 200;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    });
}

const sealedState = (url: string) => new URL(url).searchParams.get("state")!;

describe("IntegrationsService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetMcpSessions();
  });

  it("reports how each kind of plugin connects and which cannot", async () => {
    const { service } = setup();
    const catalog = await service.catalog(1);
    const plugin = (id: string) =>
      catalog.plugins.find((item) => item.id === id)!;
    expect(plugin("github").status).toBe("available");
    expect(plugin("zoom").status).toBe("unconfigured");
    expect(plugin("zoom").unavailableReason).toContain("Zoom app credentials");
    // MCP plugins register themselves at the provider: no server keys needed.
    expect(plugin("linear")).toMatchObject({
      status: "available",
      authorization: "OAuth (MCP)",
    });
    expect(plugin("render").auth).toMatchObject({
      type: "token",
      fields: [{ key: "token", secret: true }],
    });
    expect(plugin("shazam").status).toBe("unavailable");
    expect(plugin("apple-music").unavailableReason).toContain(
      "APPLE_MUSIC_TEAM_ID",
    );
    expect(plugin("atlassian").prompts).toHaveLength(3);
    expect(catalog.plugins.length).toBeGreaterThanOrEqual(43);
    expect(new Set(catalog.plugins.map((item) => item.about)).size).toBe(
      catalog.plugins.length,
    );
  });

  it("disables every plugin without an encryption key", async () => {
    const { service } = setup({
      INTEGRATIONS_ENCRYPTION_KEY: "",
      WORKSPACE_ENCRYPTION_KEY: "",
    });
    const catalog = await service.catalog(1);
    expect(catalog.encryptionAvailable).toBe(false);
    expect(
      catalog.plugins.every((plugin) =>
        ["unconfigured", "unavailable"].includes(plugin.status),
      ),
    ).toBe(true);
  });

  it("builds a PKCE authorization URL with a sealed state", async () => {
    const { service } = setup();
    const { url, nonce } = await service.authorize(7, "github");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3001/api/integrations/github/callback",
    );
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("scope")).toBe("repo read:user workflow");
    // Neither the user id nor the verifier is readable from the URL.
    expect(parsed.searchParams.get("state")).not.toContain(nonce);
    expect(url).not.toContain('"u":7');
  });

  it("uses 127.0.0.1 for providers that refuse localhost redirects", async () => {
    const { service } = setup({
      ZOOM_INTEGRATION_CLIENT_ID: "z",
      ZOOM_INTEGRATION_CLIENT_SECRET: "s",
    });
    const zoom = new URL((await service.authorize(1, "zoom")).url);
    expect(zoom.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:3001/api/integrations/zoom/callback",
    );
    expect(service.redirectUri("github")).toBe(
      "http://localhost:3001/api/integrations/github/callback",
    );
  });

  it("refuses a callback from a browser that did not start the flow", async () => {
    const { service } = setup();
    const { url } = await service.authorize(7, "github");
    await expect(
      service.callback(
        "github",
        { state: sealedState(url), code: "abc" },
        "other-nonce",
      ),
    ).rejects.toThrow("session_mismatch");
  });

  it("exchanges the code and stores only encrypted tokens", async () => {
    const { service, repo } = setup();
    const { url, nonce } = await service.authorize(7, "github");
    const fetchMock = mockFetch((target, init) => {
      if (target.includes("access_token")) {
        const body = new URLSearchParams(init.body as string);
        expect(body.get("code")).toBe("abc");
        expect(body.get("code_verifier")).toBeTruthy();
        return { access_token: "gho_secret", scope: "repo,read:user" };
      }
      return { login: "octo" };
    });
    await expect(
      service.callback(
        "github",
        { state: sealedState(url), code: "abc" },
        nonce,
      ),
    ).resolves.toBe("github");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(repo.rows[0]).toMatchObject({
      userId: 7,
      pluginId: "github",
      accountLabel: "octo",
      status: "connected",
    });
    expect(repo.rows[0].encryptedAccessToken).not.toContain("gho_secret");
    expect((await service.context(7, "github")).token).toBe("gho_secret");
  });

  it("refreshes an access token that is about to expire", async () => {
    const { service, repo } = setup({
      GOOGLE_INTEGRATION_CLIENT_ID: "g",
      GOOGLE_INTEGRATION_CLIENT_SECRET: "s",
    });
    const { url, nonce } = await service.authorize(3, "gmail");
    mockFetch((target) =>
      target.includes("oauth2.googleapis.com/token")
        ? { access_token: "old", refresh_token: "refresh-1", expires_in: 30 }
        : { email: "me@example.com" },
    );
    await service.callback(
      "google",
      { state: sealedState(url), code: "c" },
      nonce,
    );
    jest.restoreAllMocks();
    mockFetch((_target, init) => {
      expect(new URLSearchParams(init.body as string).get("grant_type")).toBe(
        "refresh_token",
      );
      return { access_token: "new", expires_in: 3600 };
    });
    expect((await service.context(3, "gmail")).token).toBe("new");
    expect(repo.rows[0].expiresAt!.getTime()).toBeGreaterThan(
      Date.now() + 3_000_000,
    );
  });

  it("connects an MCP plugin: discovery, one client registration, PKCE with resource, tool list", async () => {
    const { service, repo, clients } = setup();
    const calls: string[] = [];
    mockFetch((target, init) => {
      calls.push(`${init.method || "GET"} ${target}`);
      if (
        target === "https://mcp.linear.app/mcp" &&
        !(init.headers as Record<string, string>)?.Authorization
      )
        return new Response("", {
          status: 401,
          headers: {
            "WWW-Authenticate":
              'Bearer resource_metadata="https://mcp.linear.app/.well-known/oauth-protected-resource/mcp", scope="read write"',
          },
        });
      if (target.endsWith("/oauth-protected-resource/mcp"))
        return {
          resource: "https://mcp.linear.app/mcp",
          authorization_servers: ["https://mcp.linear.app"],
        };
      if (
        target ===
        "https://mcp.linear.app/.well-known/oauth-authorization-server"
      )
        return {
          authorization_endpoint: "https://mcp.linear.app/authorize",
          token_endpoint: "https://mcp.linear.app/token",
          registration_endpoint: "https://mcp.linear.app/register",
        };
      if (target.endsWith("/register")) {
        expect(JSON.parse(init.body as string)).toMatchObject({
          client_name: "Genyxo",
          redirect_uris: [
            "http://localhost:3001/api/integrations/mcp/callback",
          ],
          token_endpoint_auth_method: "none",
        });
        return { client_id: "client-123" };
      }
      if (target.endsWith("/token")) {
        const body = new URLSearchParams(init.body as string);
        expect(body.get("client_id")).toBe("client-123");
        expect(body.get("resource")).toBe("https://mcp.linear.app/mcp");
        expect(body.get("code_verifier")).toBeTruthy();
        return {
          access_token: "lin_tok",
          refresh_token: "lin_ref",
          expires_in: 3600,
        };
      }
      if (target === "https://mcp.linear.app/mcp") {
        const message = JSON.parse(init.body as string);
        if (message.method === "initialize")
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: message.id,
              result: { protocolVersion: "2025-06-18" },
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Mcp-Session-Id": "s1",
              },
            },
          );
        if (message.method === "notifications/initialized")
          return new Response(null, { status: 202 });
        // Streamable HTTP may answer as an SSE stream.
        return new Response(
          `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "create_issue", description: "Create an issue", inputSchema: { type: "object", properties: { title: { type: "string" } } } }] } })}\n\n`,
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }
      return { __status: 404 };
    });
    const first = await service.authorize(5, "linear");
    const authorize = new URL(first.url);
    expect(authorize.origin + authorize.pathname).toBe(
      "https://mcp.linear.app/authorize",
    );
    expect(authorize.searchParams.get("client_id")).toBe("client-123");
    expect(authorize.searchParams.get("resource")).toBe(
      "https://mcp.linear.app/mcp",
    );
    expect(authorize.searchParams.get("scope")).toBe("read write");
    await service.authorize(5, "linear");
    expect(calls.filter((call) => call.endsWith("/register"))).toHaveLength(1);
    expect(clients.rows).toHaveLength(1);

    await expect(
      service.callback(
        "mcp",
        { state: sealedState(first.url), code: "code-1" },
        first.nonce,
      ),
    ).resolves.toBe("linear");
    expect(repo.rows[0]).toMatchObject({
      pluginId: "linear",
      status: "connected",
    });
    expect(
      (await service.mcpTools(5, "linear")).map((tool) => tool.name),
    ).toEqual(["create_issue"]);
    const detail = await service.detail(5, "linear");
    expect(detail.connection?.tools).toEqual([
      { name: "create_issue", readOnly: false },
    ]);
  });

  it("checks multi-field credentials with the provider before saving them", async () => {
    const { service, repo } = setup();
    mockFetch(() => ({
      __status: 401,
      errors: [{ message: "Invalid API key" }],
    }));
    await expect(
      service.connectToken(1, "shopify", {
        fields: { shop: "demo.myshopify.com", token: "shpat_bad" },
      }),
    ).rejects.toThrow("Shopify rejected these credentials");
    expect(repo.rows).toHaveLength(0);
    await expect(
      service.connectToken(1, "shopify", { fields: { token: "shpat_x" } }),
    ).rejects.toThrow("Enter Store domain");
    jest.restoreAllMocks();
    const fetchMock = mockFetch(() => ({
      data: { shop: { name: "Demo", myshopifyDomain: "demo.myshopify.com" } },
    }));
    await service.connectToken(1, "shopify", {
      fields: { shop: "https://demo.myshopify.com/", token: "shpat_good" },
    });
    expect(new URL(fetchMock.mock.calls[0][0] as string | URL).href).toBe(
      "https://demo.myshopify.com/admin/api/2025-07/graphql.json",
    );
    expect(repo.rows[0]).toMatchObject({
      pluginId: "shopify",
      accountLabel: "Demo (demo.myshopify.com)",
    });
    expect(repo.rows[0].encryptedAccessToken).not.toContain("shpat_good");
    expect((await service.context(1, "shopify")).credentials).toEqual({
      shop: "https://demo.myshopify.com/",
      token: "shpat_good",
    });
  });

  it("turns on plugins that need no account and stores the action policy", async () => {
    const { service, repo } = setup();
    await service.enable(2, "binance");
    expect(repo.rows[0]).toMatchObject({
      pluginId: "binance",
      status: "connected",
      accountLabel: "No account needed",
    });
    await expect(service.enable(2, "github")).rejects.toThrow(
      "needs an account",
    );
    await expect(
      service.updateSettings(2, "binance", { policy: "low-risk" }),
    ).resolves.toEqual({ policy: "low-risk" });
    await expect(
      service.updateSettings(2, "binance", { policy: "always" }),
    ).rejects.toThrow("policy");
    expect((await service.connectedPlugins(2))[0]).toMatchObject({
      policy: "low-risk",
    });
  });

  it("revokes the GitHub grant and deletes the tokens on disconnect", async () => {
    const { service, repo } = setup();
    const { url, nonce } = await service.authorize(7, "github");
    mockFetch((target) =>
      target.includes("access_token")
        ? { access_token: "gho_x" }
        : { login: "octo" },
    );
    await service.callback(
      "github",
      { state: sealedState(url), code: "c" },
      nonce,
    );
    jest.restoreAllMocks();
    const revoke = mockFetch(() => ({}));
    await expect(service.disconnect(7, "github")).resolves.toEqual({
      disconnected: true,
      revoked: true,
    });
    expect(revoke.mock.calls[0][0] as string).toBe(
      "https://api.github.com/applications/gh-client/grant",
    );
    expect((revoke.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
    expect(repo.rows).toHaveLength(0);
  });
});
