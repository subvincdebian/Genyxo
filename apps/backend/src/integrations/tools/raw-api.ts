import {
  IntegrationTool,
  need,
  object,
  s,
  str,
  ToolContext,
  ToolInputError,
} from "./types";

/**
 * One "raw API" tool per REST plugin, so a model can reach every documented
 * endpoint, not only the curated tools. Reads run at once; any other method
 * becomes a confirmation card showing the exact request.
 */
interface RawApi {
  pluginId: string;
  /** Base URL; the requested path is appended and must stay inside it. */
  base: (ctx: ToolContext) => string;
  docs: string;
  headers?: (ctx: ToolContext) => Record<string, string>;
  /** GraphQL endpoint: one tool taking a query, mutations need confirmation. */
  graphql?: boolean;
  readOnly?: boolean;
  /** Skip the default Bearer header (custom auth header instead). */
  noAuth?: boolean;
}

const APIS: RawApi[] = [
  {
    pluginId: "github",
    base: () => "https://api.github.com",
    docs: "https://docs.github.com/en/rest",
    headers: () => ({
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }),
  },
  {
    pluginId: "gmail",
    base: () => "https://gmail.googleapis.com/gmail/v1/users/me",
    docs: "https://developers.google.com/gmail/api/reference/rest",
  },
  {
    pluginId: "google-drive",
    base: () => "https://www.googleapis.com/drive/v3",
    docs: "https://developers.google.com/drive/api/reference/rest/v3",
  },
  {
    pluginId: "google-calendar",
    base: () => "https://www.googleapis.com/calendar/v3",
    docs: "https://developers.google.com/calendar/api/v3/reference",
  },
  {
    pluginId: "outlook-email",
    base: () => "https://graph.microsoft.com/v1.0/me",
    docs: "https://learn.microsoft.com/graph/api/resources/mail-api-overview",
  },
  {
    pluginId: "outlook-calendar",
    base: () => "https://graph.microsoft.com/v1.0/me",
    docs: "https://learn.microsoft.com/graph/api/resources/calendar",
  },
  {
    pluginId: "microsoft-teams",
    base: () => "https://graph.microsoft.com/v1.0",
    docs: "https://learn.microsoft.com/graph/api/resources/teams-api-overview",
  },
  {
    pluginId: "zoom",
    base: () => "https://api.zoom.us/v2",
    docs: "https://developers.zoom.us/docs/api/",
  },
  {
    pluginId: "render",
    base: () => "https://api.render.com/v1",
    docs: "https://api-docs.render.com/reference",
  },
  {
    pluginId: "spotify",
    base: () => "https://api.spotify.com/v1",
    docs: "https://developer.spotify.com/documentation/web-api",
  },
  {
    pluginId: "linkedin",
    base: () => "https://api.linkedin.com",
    docs: "https://learn.microsoft.com/linkedin/",
    headers: () => ({
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202509",
    }),
  },
  {
    pluginId: "mongodb-atlas",
    base: () => "https://cloud.mongodb.com/api/atlas/v2",
    docs: "https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/",
    headers: () => ({
      Accept: "application/vnd.atlas.2023-02-01+json",
      "Content-Type": "application/vnd.atlas.2023-02-01+json",
    }),
  },
  {
    pluginId: "tripo",
    base: () => "https://api.tripo3d.ai/v2/openapi",
    docs: "https://platform.tripo3d.ai/docs",
  },
  {
    pluginId: "shopify",
    base: (ctx) => `https://${shopDomain(ctx)}/admin/api/2025-07/graphql.json`,
    docs: "https://shopify.dev/docs/api/admin-graphql",
    graphql: true,
    noAuth: true,
    headers: (ctx) => ({ "X-Shopify-Access-Token": ctx.token }),
  },
  {
    pluginId: "stack-overflow",
    base: () => "https://api.stackexchange.com/2.3",
    docs: "https://api.stackexchange.com/docs",
    readOnly: true,
    noAuth: true,
  },
  {
    pluginId: "binance",
    base: () => "https://data-api.binance.vision/api/v3",
    docs: "https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints",
    readOnly: true,
    noAuth: true,
  },
  {
    pluginId: "bybit",
    base: () => "https://api.bybit.com/v5/market",
    docs: "https://bybit-exchange.github.io/docs/v5/market/time",
    readOnly: true,
    noAuth: true,
  },
  {
    pluginId: "apple-music",
    base: () => "https://api.music.apple.com/v1",
    docs: "https://developer.apple.com/documentation/applemusicapi",
    readOnly: true,
  },
];

export function shopDomain(ctx: ToolContext) {
  const shop = String(ctx.credentials.shop || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))
    throw new ToolInputError(
      "The store domain must look like your-store.myshopify.com",
    );
  return shop;
}

function target(api: RawApi, ctx: ToolContext, path: string, query?: string) {
  const base = new URL(api.base(ctx));
  if (
    !path.startsWith("/") ||
    path.includes("..") ||
    path.includes("//") ||
    /[\s#]/.test(path)
  )
    throw new ToolInputError(
      "path must be an absolute API path like /repos/owner/name",
    );
  const url = new URL(base.toString().replace(/\/$/, "") + path);
  if (
    url.origin !== base.origin ||
    !url.pathname.startsWith(base.pathname.replace(/\/$/, ""))
  )
    throw new ToolInputError("path must stay inside the provider API");
  for (const [key, value] of new URLSearchParams(query || ""))
    url.searchParams.append(key, value);
  return url;
}

function parseBody(text: string | undefined) {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ToolInputError("body must be valid JSON");
  }
}

const isMutation = (query: string) =>
  /^\s*mutation\b/i.test(query.replace(/^\s*#[^\n]*\n/gm, ""));

function restTool(api: RawApi, plugin: string): IntegrationTool {
  const methods = api.readOnly
    ? ["GET"]
    : ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const run = async (ctx: ToolContext, args: Record<string, any>) => {
    const method = (str(args, "method") || "GET").toUpperCase();
    if (!methods.includes(method))
      throw new ToolInputError(`method must be one of ${methods.join(", ")}`);
    const url = target(
      api,
      ctx,
      need(args, "path", 2000),
      str(args, "query", { max: 4000 }),
    );
    const body = parseBody(str(args, "body", { max: 200_000 }));
    return ctx.fetch(url.toString(), {
      method,
      headers: api.headers?.(ctx),
      noAuth: api.noAuth,
      ...(body === undefined ? {} : { json: body }),
    });
  };
  return {
    name: `${plugin}_api_request`,
    pluginId: api.pluginId,
    label: "Calling the API",
    description: `Call any ${api.readOnly ? "read-only " : ""}endpoint of this provider's REST API (base ${api.base({ credentials: { shop: "your-store.myshopify.com" } } as unknown as ToolContext)}) as the signed-in user. Use it when no specific tool fits. Reference: ${api.docs}.${api.readOnly ? "" : " GET runs at once; other methods ask the user to confirm."}`,
    parameters: object(
      {
        method: {
          type: "string",
          enum: methods,
          description: "HTTP method, default GET",
        },
        path: s("Path appended to the base URL, starting with /"),
        query: s("Query string without '?', e.g. per_page=20&state=open"),
        body: s("JSON request body as text"),
      },
      ["path"],
    ),
    run,
  };
}

function graphqlTool(api: RawApi, plugin: string): IntegrationTool {
  return {
    name: `${plugin}_graphql`,
    pluginId: api.pluginId,
    label: "Running a GraphQL query",
    description: `Run a GraphQL query or mutation against the provider's API. Reference: ${api.docs}. Queries run at once; mutations ask the user to confirm.`,
    parameters: object(
      { query: s("GraphQL document"), variables: s("Variables as JSON text") },
      ["query"],
    ),
    run: async (ctx, args) =>
      ctx.fetch(
        target(api, ctx, "/", undefined).toString().replace(/\/$/, ""),
        {
          method: "POST",
          headers: api.headers?.(ctx),
          noAuth: api.noAuth,
          json: {
            query: need(args, "query", 100_000),
            variables:
              parseBody(str(args, "variables", { max: 100_000 })) || {},
          },
        },
      ),
  };
}

/** Raw API tools, plus whether a given call needs the user's confirmation. */
export const rawApiTools: IntegrationTool[] = APIS.map((api) => {
  const plugin = api.pluginId.replace(/-/g, "_");
  return api.graphql ? graphqlTool(api, plugin) : restTool(api, plugin);
});

/** Raw calls are writes unless they only read. */
export function rawCallWrites(
  tool: IntegrationTool,
  args: Record<string, any>,
) {
  if (tool.name.endsWith("_graphql"))
    return isMutation(String(args.query || ""));
  if (!tool.name.endsWith("_api_request")) return Boolean(tool.write);
  return String(args.method || "GET").toUpperCase() !== "GET";
}

export function rawCallPreview(
  pluginName: string,
  tool: IntegrationTool,
  args: Record<string, any>,
) {
  if (tool.name.endsWith("_graphql"))
    return {
      title: `${pluginName} GraphQL mutation`,
      fields: [],
      body: `${String(args.query || "")}${args.variables ? `\n\nvariables: ${String(args.variables)}` : ""}`,
    };
  return {
    title: `${pluginName} API request`,
    fields: [
      {
        label: "Request",
        value: `${String(args.method || "GET").toUpperCase()} ${String(args.path || "")}${args.query ? `?${String(args.query)}` : ""}`,
      },
    ],
    body: args.body ? String(args.body) : undefined,
  };
}
