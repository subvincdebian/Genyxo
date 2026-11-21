import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { Repository } from "typeorm";
import {
  AUTH_FAMILIES,
  AuthFamily,
  CATEGORIES,
  findPlugin,
  McpAuth,
  OAuthFamily,
  PluginDefinition,
  PLUGINS,
} from "./catalog";
import { IntegrationClient } from "./integration-client.entity";
import { IntegrationConnection } from "./integration-connection.entity";
import { McpTool, mcpListTools } from "./mcp/mcp-client";
import {
  discoverAuthServer,
  McpAuthServer,
  registerClient,
} from "./mcp/mcp-oauth";
import { TokenCipher } from "./token-cipher";
import { describeAccount, providerFetch, ToolContext } from "./tools";
import { atlasToken } from "./tools/business";
import { appleMusicToken } from "./tools/music";

const STATE_TTL_MS = 10 * 60_000;
const TOOLS_TTL_MS = 6 * 60 * 60_000;
export const NONCE_COOKIE = "gx_integration_nonce";
export type ActionPolicy = "ask" | "low-risk";

interface OAuthState {
  u: number;
  p: string;
  n: string;
  v?: string;
  e: number;
  /** MCP flows: where to exchange the code. */
  m?: {
    issuer: string;
    token: string;
    resource: string;
    client: string;
    revoke?: string;
  };
}
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  [key: string]: unknown;
}
interface StoredMcp {
  issuer: string;
  tokenEndpoint: string;
  resource: string;
  clientId: string;
  revocationEndpoint?: string;
  tools?: McpTool[];
  toolsAt?: number;
}

const SUPPORTED_AUTH: Record<string, string> = {
  oauth: "OAuth",
  mcp: "OAuth (MCP)",
  token: "API key",
  none: "None",
  unavailable: "—",
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly cipher: TokenCipher;
  private readonly refreshing = new Map<
    number,
    Promise<IntegrationConnection>
  >();

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(IntegrationConnection)
    private readonly connections: Repository<IntegrationConnection>,
    @InjectRepository(IntegrationClient)
    private readonly clients: Repository<IntegrationClient>,
  ) {
    this.cipher = new TokenCipher(
      config.get<string>("INTEGRATIONS_ENCRYPTION_KEY") ||
        config.get<string>("WORKSPACE_ENCRYPTION_KEY"),
    );
  }

  private env(names: string[]) {
    for (const name of names) {
      const value = this.config.get<string>(name)?.trim();
      if (value) return value;
    }
    return "";
  }
  private credentials(family: OAuthFamily) {
    return {
      clientId: this.env(family.clientIdEnv),
      clientSecret: this.env(family.clientSecretEnv),
    };
  }
  publicUrl() {
    return (
      this.config.get<string>("INTEGRATIONS_PUBLIC_URL") ||
      this.config.get<string>("FRONTEND_URL") ||
      "http://localhost:3001"
    ).replace(/\/+$/, "");
  }
  redirectUri(family: AuthFamily | "mcp") {
    const base = new URL(this.publicUrl());
    // Zoom and Spotify refuse "localhost"; the loopback IP reaches the same server.
    if (
      family !== "mcp" &&
      AUTH_FAMILIES[family].loopbackRedirect &&
      base.hostname === "localhost"
    )
      base.hostname = "127.0.0.1";
    return `${base.origin}/api/integrations/${family}/callback`;
  }

  /** Why a plugin cannot connect on this server, or null when it can. */
  unavailableReason(plugin: PluginDefinition): string | null {
    if (plugin.auth.type === "unavailable") return plugin.auth.reason;
    if (!this.cipher.available)
      return "This server cannot store plugin connections until INTEGRATIONS_ENCRYPTION_KEY is set.";
    if (plugin.auth.type === "oauth") {
      const family = AUTH_FAMILIES[plugin.auth.family];
      const { clientId, clientSecret } = this.credentials(family);
      return clientId && clientSecret
        ? null
        : `This server has no ${family.label} app credentials yet. An administrator adds them in the backend .env.`;
    }
    if (
      plugin.auth.type === "none" &&
      plugin.auth.env?.some((name) => !this.env([name]))
    )
      return `This server is missing ${plugin.auth.env.filter((name) => !this.env([name])).join(", ")}.`;
    return null;
  }
  isConfigured(plugin: PluginDefinition) {
    return this.unavailableReason(plugin) === null;
  }

  requirePlugin(id: string) {
    const plugin = findPlugin(id);
    if (!plugin) throw new NotFoundException("Unknown plugin");
    return plugin;
  }

  private view(
    plugin: PluginDefinition,
    connection: IntegrationConnection | undefined,
  ) {
    const reason = this.unavailableReason(plugin);
    const auth = plugin.auth;
    const mcp = (connection?.metadata?.mcp as StoredMcp | undefined) || null;
    return {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      about: plugin.about,
      prompts: plugin.prompts,
      categories: plugin.categories,
      categoryNames: plugin.categories.map(
        (id) => CATEGORIES.find((item) => item.id === id)?.name || id,
      ),
      permissions: plugin.permissions,
      capabilities: plugin.capabilities,
      apps: plugin.apps,
      website: plugin.website,
      version: plugin.version,
      tint: plugin.tint,
      developer: "Genyxo",
      auth:
        auth.type === "token"
          ? {
              type: "token",
              fields: auth.fields.map(
                ({ key, label, placeholder, secret, optional }) => ({
                  key,
                  label,
                  placeholder,
                  secret: Boolean(secret),
                  optional: Boolean(optional),
                }),
              ),
              help: auth.help,
              docsUrl: auth.docsUrl,
            }
          : auth.type === "oauth"
            ? { type: "oauth", provider: AUTH_FAMILIES[auth.family].label }
            : auth.type === "mcp"
              ? { type: "mcp", provider: plugin.name, open: Boolean(auth.open) }
              : { type: auth.type },
      authorization: SUPPORTED_AUTH[auth.type],
      configured: reason === null,
      unavailableReason: reason,
      status: connection
        ? connection.status
        : auth.type === "unavailable"
          ? "unavailable"
          : reason === null
            ? "available"
            : "unconfigured",
      policy: (connection?.metadata?.policy as ActionPolicy) || "ask",
      connection: connection
        ? {
            account: connection.accountLabel,
            connectedAt: connection.createdAt,
            scopes: connection.scopes || [],
            tools: (mcp?.tools || []).map((tool) => ({
              name: tool.title || tool.annotations?.title || tool.name,
              readOnly: Boolean(tool.annotations?.readOnlyHint),
            })),
          }
        : null,
    };
  }

  async catalog(userId: number) {
    const rows = await this.connections.find({ where: { userId } });
    return {
      categories: CATEGORIES,
      encryptionAvailable: this.cipher.available,
      plugins: PLUGINS.map((plugin) =>
        this.view(
          plugin,
          rows.find((row) => row.pluginId === plugin.id),
        ),
      ),
    };
  }

  async detail(userId: number, pluginId: string) {
    const plugin = this.requirePlugin(pluginId);
    const row =
      (await this.connections.findOne({ where: { userId, pluginId } })) ||
      undefined;
    return this.view(plugin, row);
  }

  // ---------- Authorization ----------

  private seal(state: OAuthState) {
    return this.cipher.encrypt(JSON.stringify(state));
  }
  private challenge(verifier: string) {
    return createHash("sha256").update(verifier).digest("base64url");
  }

  /** Starts an authorization: the state is sealed, and its nonce is bound to this browser by cookie. */
  async authorize(userId: number, pluginId: string) {
    const plugin = this.requirePlugin(pluginId);
    const reason = this.unavailableReason(plugin);
    if (reason) throw new ServiceUnavailableException(reason);
    const nonce = randomBytes(18).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const base = {
      u: userId,
      p: plugin.id,
      n: nonce,
      e: Date.now() + STATE_TTL_MS,
    };

    if (plugin.auth.type === "mcp" && !plugin.auth.open) {
      const auth = plugin.auth;
      let server: McpAuthServer & { challengeScope?: string };
      let client: { clientId: string };
      try {
        server = await discoverAuthServer(auth.url);
        client = await this.mcpClient(server, this.scopeFor(auth, server));
      } catch (error: any) {
        this.logger.warn(
          `${plugin.name} MCP discovery failed: ${error?.message}`,
        );
        throw new ServiceUnavailableException(
          `${plugin.name} sign-in is not reachable right now. Try again later.`,
        );
      }
      const url = new URL(server.authorizationEndpoint);
      const scope = this.scopeFor(auth, server);
      const params: Record<string, string> = {
        response_type: "code",
        client_id: client.clientId,
        redirect_uri: this.redirectUri("mcp"),
        state: this.seal({
          ...base,
          v: verifier,
          m: {
            issuer: server.issuer,
            token: server.tokenEndpoint,
            resource: server.resource,
            client: client.clientId,
            revoke: server.revocationEndpoint,
          },
        }),
        code_challenge: this.challenge(verifier),
        code_challenge_method: "S256",
        resource: server.resource,
        ...(scope ? { scope } : {}),
      };
      for (const [key, value] of Object.entries(params))
        url.searchParams.set(key, value);
      return { url: url.toString(), nonce };
    }

    if (plugin.auth.type !== "oauth")
      throw new BadRequestException("This plugin does not use sign-in");
    const family = AUTH_FAMILIES[plugin.auth.family];
    const url = new URL(family.authorizeUrl);
    const params: Record<string, string> = {
      client_id: this.credentials(family).clientId,
      redirect_uri: this.redirectUri(family.id),
      response_type: "code",
      state: this.seal({ ...base, v: family.pkce ? verifier : undefined }),
      ...(plugin.auth.scopes.length
        ? { scope: plugin.auth.scopes.join(family.scopeSeparator) }
        : {}),
      ...(family.pkce
        ? {
            code_challenge: this.challenge(verifier),
            code_challenge_method: "S256",
          }
        : {}),
      ...family.authorizeParams,
    };
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    return { url: url.toString(), nonce };
  }

  private scopeFor(
    auth: McpAuth,
    server: McpAuthServer & { challengeScope?: string },
  ) {
    return (
      (
        auth.scopes?.join(" ") ||
        server.challengeScope ||
        server.scopes.join(" ") ||
        ""
      ).trim() || undefined
    );
  }

  /** The OAuth client Genyxo registered at this authorization server, registering once. */
  private async mcpClient(server: McpAuthServer, scope?: string) {
    const redirectUri = this.redirectUri("mcp");
    const existing = await this.clients.findOne({
      where: { issuer: server.issuer.slice(0, 255), redirectUri },
    });
    if (existing) return existing;
    const registered = await registerClient(server, redirectUri, scope);
    return this.clients.save(
      this.clients.create({
        issuer: server.issuer.slice(0, 255),
        redirectUri,
        clientId: registered.clientId,
        encryptedClientSecret: registered.clientSecret
          ? this.cipher.encrypt(registered.clientSecret)
          : null,
        authMethod: registered.authMethod.slice(0, 40),
      }),
    );
  }

  /** Returns the plugin id on success. Throws a short code for the redirect on failure. */
  async callback(
    familyId: string,
    query: Record<string, string | undefined>,
    cookieNonce: string | undefined,
  ): Promise<string> {
    if (familyId !== "mcp" && !AUTH_FAMILIES[familyId as AuthFamily])
      throw new BadRequestException("unknown_provider");
    let state: OAuthState;
    try {
      state = JSON.parse(this.cipher.decrypt(String(query.state || "")));
    } catch {
      throw new BadRequestException("invalid_state");
    }
    const plugin = findPlugin(state.p);
    const matches =
      plugin &&
      (familyId === "mcp"
        ? plugin.auth.type === "mcp" && Boolean(state.m)
        : plugin.auth.type === "oauth" && plugin.auth.family === familyId);
    if (!plugin || !matches) throw new BadRequestException("invalid_state");
    if (state.e < Date.now()) throw new BadRequestException("expired");
    // The nonce cookie proves this browser started the flow (login CSRF guard).
    if (!cookieNonce || cookieNonce !== state.n)
      throw new BadRequestException("session_mismatch");
    if (query.error)
      throw new BadRequestException(
        query.error === "access_denied" ? "denied" : "provider_error",
      );
    if (!query.code) throw new BadRequestException("missing_code");

    if (state.m) {
      const token = await this.mcpTokenRequest(
        state.m.issuer,
        state.m.token,
        state.m.client,
        {
          grant_type: "authorization_code",
          code: query.code,
          redirect_uri: this.redirectUri("mcp"),
          code_verifier: String(state.v),
          resource: state.m.resource,
        },
      );
      await this.store(state.u, plugin, token, {
        mcp: {
          issuer: state.m.issuer,
          tokenEndpoint: state.m.token,
          resource: state.m.resource,
          clientId: state.m.client,
          revocationEndpoint: state.m.revoke,
        },
      });
      return plugin.id;
    }
    const family = AUTH_FAMILIES[familyId as AuthFamily];
    const token = await this.tokenRequest(family, {
      grant_type: "authorization_code",
      code: query.code,
      redirect_uri: this.redirectUri(family.id),
      ...(state.v ? { code_verifier: state.v } : {}),
    });
    await this.store(state.u, plugin, token);
    return plugin.id;
  }

  private async postToken(
    url: string,
    headers: Record<string, string>,
    body: string,
    label: string,
  ): Promise<TokenResponse> {
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", ...headers },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json().catch(() => ({}))) as TokenResponse;
    if (!response.ok || !data.access_token) {
      this.logger.warn(
        `${label} token request failed: ${response.status} ${data.error || ""}`,
      );
      throw new BadRequestException("token_exchange_failed");
    }
    return data;
  }

  private tokenRequest(family: OAuthFamily, body: Record<string, string>) {
    const { clientId, clientSecret } = this.credentials(family);
    const fields =
      family.tokenAuth === "body"
        ? { ...body, client_id: clientId, client_secret: clientSecret }
        : body;
    const headers: Record<string, string> = {
      "Content-Type":
        family.tokenFormat === "json"
          ? "application/json"
          : "application/x-www-form-urlencoded",
    };
    if (family.tokenAuth === "basic")
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    return this.postToken(
      family.tokenUrl,
      headers,
      family.tokenFormat === "json"
        ? JSON.stringify(fields)
        : new URLSearchParams(fields).toString(),
      family.label,
    );
  }

  private async mcpTokenRequest(
    issuer: string,
    tokenEndpoint: string,
    clientId: string,
    body: Record<string, string>,
  ) {
    const client = await this.clients.findOne({
      where: {
        issuer: issuer.slice(0, 255),
        redirectUri: this.redirectUri("mcp"),
      },
    });
    const secret = client?.encryptedClientSecret
      ? this.cipher.decrypt(client.encryptedClientSecret)
      : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const fields: Record<string, string> = { ...body, client_id: clientId };
    if (secret && client?.authMethod === "client_secret_basic")
      headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`).toString("base64")}`;
    else if (secret) fields.client_secret = secret;
    return this.postToken(
      tokenEndpoint,
      headers,
      new URLSearchParams(fields).toString(),
      issuer,
    );
  }

  private async store(
    userId: number,
    plugin: PluginDefinition,
    token: TokenResponse,
    extra: Record<string, unknown> = {},
    secret?: string,
  ) {
    const accessToken = String(token.access_token || "");
    const row =
      (await this.connections.findOne({
        where: { userId, pluginId: plugin.id },
      })) ||
      this.connections.create({ userId, pluginId: plugin.id, metadata: {} });
    const sealed = secret ?? accessToken;
    let account: { label: string | null; metadata: Record<string, unknown> } = {
      label: null,
      metadata: {},
    };
    if (plugin.auth.type === "oauth")
      account = await describeAccount(
        plugin.id,
        this.toolContext(accessToken, {}, {}),
      ).catch((error) => {
        this.logger.warn(
          `${plugin.name} account lookup failed: ${error?.message}`,
        );
        return { label: null, metadata: {} };
      });
    // OpenID servers return who signed in; the payload is only displayed, never trusted for access.
    if (plugin.auth.type === "mcp" && typeof token.id_token === "string") {
      try {
        const claims = JSON.parse(
          Buffer.from(token.id_token.split(".")[1], "base64url").toString(
            "utf8",
          ),
        );
        account = {
          label:
            claims.email || claims.name || claims.preferred_username || null,
          metadata: {},
        };
      } catch {
        // Unreadable id_token: keep the generic label.
      }
    }
    const expiresIn = Number(token.expires_in);
    Object.assign(row, {
      accountLabel: account.label
        ? String(account.label).slice(0, 200)
        : row.accountLabel || null,
      scopes: token.scope
        ? String(token.scope)
            .split(/[\s,]+/)
            .filter(Boolean)
        : plugin.auth.type === "oauth"
          ? plugin.auth.scopes
          : null,
      encryptedAccessToken: this.cipher.encrypt(sealed),
      encryptedRefreshToken: token.refresh_token
        ? this.cipher.encrypt(String(token.refresh_token))
        : row.encryptedRefreshToken || null,
      expiresAt:
        Number.isFinite(expiresIn) && expiresIn > 0
          ? new Date(Date.now() + expiresIn * 1000)
          : null,
      metadata: {
        ...(row.metadata || {}),
        ...account.metadata,
        ...extra,
        ...(token.workspace_name ? { workspace: token.workspace_name } : {}),
      },
      status: "connected",
    });
    const saved = await this.connections.save(row);
    if (plugin.auth.type === "mcp")
      await this.refreshMcpTools(saved).catch((error) =>
        this.logger.warn(`${plugin.name} tools/list failed: ${error?.message}`),
      );
    return saved;
  }

  /** Links a token plugin after checking the key against the provider. */
  async connectToken(
    userId: number,
    pluginId: string,
    body: { token?: unknown; fields?: unknown },
  ) {
    const plugin = this.requirePlugin(pluginId);
    if (plugin.auth.type !== "token")
      throw new BadRequestException("This plugin does not use an API key");
    const reason = this.unavailableReason(plugin);
    if (reason) throw new ServiceUnavailableException(reason);
    const raw =
      body?.fields && typeof body.fields === "object"
        ? (body.fields as Record<string, unknown>)
        : { token: body?.token };
    const fields: Record<string, string> = {};
    for (const field of plugin.auth.fields) {
      const value =
        typeof raw[field.key] === "string" ? String(raw[field.key]).trim() : "";
      if (!value && !field.optional)
        throw new BadRequestException(`Enter ${field.label}`);
      if (value.length > 4000 || (field.secret && /\s/.test(value)))
        throw new BadRequestException(`${field.label} is not valid`);
      if (value) fields[field.key] = value;
    }
    const ctx = await this.contextFor(plugin, fields, {});
    let account: { label: string; metadata: Record<string, unknown> };
    try {
      account = await describeAccount(plugin.id, ctx);
    } catch {
      throw new BadRequestException(
        `${plugin.name} rejected these credentials`,
      );
    }
    const row = await this.store(
      userId,
      plugin,
      { access_token: "stored" },
      account.metadata,
      JSON.stringify({ v: 2, fields }),
    );
    row.accountLabel = account.label
      ? String(account.label).slice(0, 200)
      : null;
    await this.connections.save(row);
    return { connected: true };
  }

  /** Turns on a plugin that needs no account (public data, skills, open MCP servers). */
  async enable(userId: number, pluginId: string) {
    const plugin = this.requirePlugin(pluginId);
    const open =
      plugin.auth.type === "none" ||
      (plugin.auth.type === "mcp" && plugin.auth.open);
    if (!open) throw new BadRequestException("This plugin needs an account");
    const reason = this.unavailableReason(plugin);
    if (reason) throw new ServiceUnavailableException(reason);
    const row = await this.store(
      userId,
      plugin,
      { access_token: "" },
      plugin.auth.type === "mcp" ? { mcp: { resource: plugin.auth.url } } : {},
    );
    row.accountLabel = "No account needed";
    await this.connections.save(row);
    return { connected: true };
  }

  async updateSettings(
    userId: number,
    pluginId: string,
    body: { policy?: unknown },
  ) {
    this.requirePlugin(pluginId);
    const row = await this.connections.findOne({ where: { userId, pluginId } });
    if (!row) throw new BadRequestException("Connect the plugin first");
    if (body?.policy !== "ask" && body?.policy !== "low-risk")
      throw new BadRequestException("policy must be ask or low-risk");
    row.metadata = { ...(row.metadata || {}), policy: body.policy };
    await this.connections.save(row);
    return { policy: body.policy };
  }

  // ---------- Runtime ----------

  toolContext(
    token: string,
    metadata: Record<string, unknown>,
    credentials: Record<string, string>,
  ): ToolContext {
    return {
      token,
      metadata,
      credentials,
      fetch: (url, init) => providerFetch(token, url, init),
    };
  }

  /** Builds the context a plugin's tools run with from its stored secret. */
  private async contextFor(
    plugin: PluginDefinition,
    fields: Record<string, string>,
    metadata: Record<string, unknown>,
  ) {
    let token = fields.token || "";
    if (plugin.id === "mongodb-atlas") token = await atlasToken(fields);
    if (plugin.id === "apple-music")
      token = appleMusicToken((name) => this.env([name]) || undefined);
    return this.toolContext(token, metadata, fields);
  }

  private secretOf(row: IntegrationConnection) {
    const plain = this.cipher.decrypt(row.encryptedAccessToken);
    if (plain.startsWith('{"v":2')) {
      try {
        return {
          token: "",
          fields: (JSON.parse(plain).fields || {}) as Record<string, string>,
        };
      } catch {
        // Fall through to a plain token.
      }
    }
    return { token: plain, fields: {} as Record<string, string> };
  }

  async connectedPlugins(userId: number) {
    const rows = await this.connections.find({
      where: { userId, status: "connected" },
    });
    return rows
      .map((row) => ({ row, plugin: findPlugin(row.pluginId) }))
      .filter(
        (
          item,
        ): item is { row: IntegrationConnection; plugin: PluginDefinition } =>
          Boolean(item.plugin && this.isConfigured(item.plugin)),
      )
      .map(({ row, plugin }) => ({
        plugin,
        policy: (row.metadata?.policy as ActionPolicy) || "ask",
        connectionId: row.id,
      }));
  }

  /** A live context for one plugin, refreshing the access token when it is about to expire. */
  async context(
    userId: number,
    pluginId: string,
    forceRefresh = false,
  ): Promise<ToolContext> {
    let row = await this.connections.findOne({ where: { userId, pluginId } });
    const plugin = this.requirePlugin(pluginId);
    if (!row || row.status !== "connected")
      throw new BadRequestException(`${plugin.name} is not connected`);
    if (
      forceRefresh ||
      (row.expiresAt && row.expiresAt.getTime() < Date.now() + 60_000)
    )
      row = await this.refresh(row);
    const secret = this.secretOf(row);
    if (plugin.auth.type === "token")
      return this.contextFor(plugin, secret.fields, row.metadata || {});
    if (plugin.auth.type === "none")
      return this.contextFor(plugin, {}, row.metadata || {});
    return this.toolContext(secret.token, row.metadata || {}, {});
  }

  private refresh(row: IntegrationConnection) {
    const running = this.refreshing.get(row.id);
    if (running) return running;
    const task = this.doRefresh(row).finally(() =>
      this.refreshing.delete(row.id),
    );
    this.refreshing.set(row.id, task);
    return task;
  }
  private async doRefresh(row: IntegrationConnection) {
    const plugin = this.requirePlugin(row.pluginId);
    if (
      !row.encryptedRefreshToken ||
      (plugin.auth.type !== "oauth" && plugin.auth.type !== "mcp")
    )
      return row;
    try {
      const refreshToken = this.cipher.decrypt(row.encryptedRefreshToken);
      const mcp = row.metadata?.mcp as StoredMcp | undefined;
      const token =
        plugin.auth.type === "mcp" && mcp?.tokenEndpoint
          ? await this.mcpTokenRequest(
              mcp.issuer,
              mcp.tokenEndpoint,
              mcp.clientId,
              {
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                resource: mcp.resource,
              },
            )
          : await this.tokenRequest(
              AUTH_FAMILIES[(plugin.auth as { family: AuthFamily }).family],
              { grant_type: "refresh_token", refresh_token: refreshToken },
            );
      const expiresIn = Number(token.expires_in);
      row.encryptedAccessToken = this.cipher.encrypt(
        String(token.access_token),
      );
      if (token.refresh_token)
        row.encryptedRefreshToken = this.cipher.encrypt(
          String(token.refresh_token),
        );
      row.expiresAt =
        Number.isFinite(expiresIn) && expiresIn > 0
          ? new Date(Date.now() + expiresIn * 1000)
          : null;
    } catch {
      // A revoked grant cannot recover; the page asks the user to reconnect.
      row.status = "expired";
      await this.connections.save(row);
      throw new BadRequestException(
        `${plugin.name} access expired. Reconnect it on the Plugins page.`,
      );
    }
    return this.connections.save(row);
  }

  // ---------- MCP tools ----------

  private async refreshMcpTools(row: IntegrationConnection) {
    const plugin = this.requirePlugin(row.pluginId);
    if (plugin.auth.type !== "mcp") return [];
    const tools = await mcpListTools(plugin.auth.url, this.secretOf(row).token);
    row.metadata = {
      ...(row.metadata || {}),
      mcp: {
        ...(row.metadata?.mcp || {}),
        tools: tools.slice(0, 200),
        toolsAt: Date.now(),
      },
    };
    await this.connections.save(row);
    return tools;
  }

  /** The provider's tool list for a connected MCP plugin, refreshed every few hours. */
  async mcpTools(userId: number, pluginId: string): Promise<McpTool[]> {
    const row = await this.connections.findOne({ where: { userId, pluginId } });
    if (!row || row.status !== "connected") return [];
    const mcp = row.metadata?.mcp as StoredMcp | undefined;
    if (mcp?.tools && (mcp.toolsAt || 0) > Date.now() - TOOLS_TTL_MS)
      return mcp.tools;
    try {
      if (row.expiresAt && row.expiresAt.getTime() < Date.now() + 60_000)
        await this.refresh(row);
      return await this.refreshMcpTools(row);
    } catch (error: any) {
      this.logger.warn(`${pluginId} tools/list failed: ${error?.message}`);
      return mcp?.tools || [];
    }
  }

  // ---------- Disconnect ----------

  async disconnect(userId: number, pluginId: string) {
    const plugin = this.requirePlugin(pluginId);
    const row = await this.connections.findOne({ where: { userId, pluginId } });
    if (!row) return { disconnected: true, revoked: true };
    let revoked = false;
    try {
      revoked = await this.revoke(plugin, row);
    } catch (error: any) {
      this.logger.warn(`${plugin.name} revoke failed: ${error?.message}`);
    }
    await this.connections.delete({ id: row.id, userId });
    return { disconnected: true, revoked };
  }

  private async revoke(
    plugin: PluginDefinition,
    row: IntegrationConnection,
  ): Promise<boolean> {
    if (!this.cipher.available) return false;
    if (
      plugin.auth.type === "none" ||
      (plugin.auth.type === "mcp" && plugin.auth.open)
    )
      return true;
    const { token: access } = this.secretOf(row);
    const refresh = row.encryptedRefreshToken
      ? this.cipher.decrypt(row.encryptedRefreshToken)
      : null;
    const form = (token: string) => new URLSearchParams({ token }).toString();
    const post = (url: string, init: RequestInit) =>
      fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        ...init,
      }).then((response) => response.ok);
    if (plugin.auth.type === "mcp") {
      const mcp = row.metadata?.mcp as StoredMcp | undefined;
      if (!mcp?.revocationEndpoint) return false;
      return post(mcp.revocationEndpoint, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: refresh || access,
          client_id: mcp.clientId,
        }).toString(),
      });
    }
    if (plugin.auth.type !== "oauth") return false;
    const family = AUTH_FAMILIES[plugin.auth.family];
    const { clientId, clientSecret } = this.credentials(family);
    const basic = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    switch (family.id) {
      case "github":
        return post(
          `https://api.github.com/applications/${encodeURIComponent(clientId)}/grant`,
          {
            method: "DELETE",
            headers: {
              Authorization: basic,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ access_token: access }),
          },
        );
      case "google":
        return post("https://oauth2.googleapis.com/revoke", {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form(refresh || access),
        });
      case "zoom":
        return post("https://zoom.us/oauth/revoke", {
          headers: {
            Authorization: basic,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form(access),
        });
      case "linkedin":
        return post("https://www.linkedin.com/oauth/v2/revoke", {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: access,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        });
      default:
        // Microsoft and Spotify have no per-app token revocation endpoint.
        return false;
    }
  }
}
