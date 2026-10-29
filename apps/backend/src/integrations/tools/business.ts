import { shopDomain } from "./raw-api";
import {
  int,
  IntegrationTool,
  n,
  need,
  object,
  s,
  str,
  ToolContext,
  ToolInputError,
} from "./types";

// ---------- Shopify (custom app Admin API token) ----------

const shopify = <T = any>(
  ctx: ToolContext,
  query: string,
  variables: Record<string, unknown> = {},
) =>
  ctx
    .fetch<{ data?: T; errors?: { message: string }[] }>(
      `https://${shopDomain(ctx)}/admin/api/2025-07/graphql.json`,
      {
        method: "POST",
        noAuth: true,
        headers: { "X-Shopify-Access-Token": ctx.token },
        json: { query, variables },
      },
    )
    .then((result) => {
      if (result.errors?.length)
        throw new ToolInputError(
          result.errors
            .map((error) => error.message)
            .join("; ")
            .slice(0, 400),
        );
      return result.data as T;
    });

export const shopifyTools: IntegrationTool[] = [
  {
    name: "shopify_list_orders",
    pluginId: "shopify",
    label: "Listing orders",
    description:
      "Recent orders with totals, customer and status. query uses Shopify order search syntax, e.g. created_at:>2026-10-01 financial_status:paid.",
    parameters: object({
      query: s("Order search query"),
      limit: n("Up to 50"),
    }),
    run: async (ctx, args) =>
      (
        await shopify<any>(
          ctx,
          `query($n:Int!,$q:String){orders(first:$n,query:$q,sortKey:CREATED_AT,reverse:true){nodes{id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet{shopMoney{amount currencyCode}} customer{displayName email}}}}`,
          {
            n: int(args, "limit", 20, 50),
            q: str(args, "query", { max: 300 }),
          },
        )
      ).orders.nodes,
  },
  {
    name: "shopify_list_products",
    pluginId: "shopify",
    label: "Listing products",
    description:
      "Products with status, price range and total inventory. query uses Shopify product search syntax, e.g. inventory_total:<5.",
    parameters: object({
      query: s("Product search query"),
      limit: n("Up to 50"),
    }),
    run: async (ctx, args) =>
      (
        await shopify<any>(
          ctx,
          `query($n:Int!,$q:String){products(first:$n,query:$q,sortKey:UPDATED_AT,reverse:true){nodes{id title status totalInventory handle priceRangeV2{minVariantPrice{amount currencyCode} maxVariantPrice{amount}}}}}`,
          {
            n: int(args, "limit", 20, 50),
            q: str(args, "query", { max: 300 }),
          },
        )
      ).products.nodes,
  },
];

export async function shopifyAccount(ctx: ToolContext) {
  const data = await shopify<any>(ctx, "{shop{name myshopifyDomain}}");
  return {
    label: `${data.shop.name} (${data.shop.myshopifyDomain})`,
    metadata: {},
  };
}

// ---------- MongoDB Atlas (service account) ----------

const ATLAS = "https://cloud.mongodb.com/api/atlas/v2";
const atlasHeaders = { Accept: "application/vnd.atlas.2023-02-01+json" };
const tokens = new Map<string, { value: string; expires: number }>();

/** Exchanges the service account's client credentials for a one-hour token. */
export async function atlasToken(credentials: Record<string, string>) {
  const key = credentials.clientId;
  const cached = tokens.get(key);
  if (cached && cached.expires > Date.now() + 60_000) return cached.value;
  const response = await fetch("https://cloud.mongodb.com/api/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok || !data.access_token)
    throw new ToolInputError(
      "MongoDB Atlas rejected the service account credentials",
    );
  tokens.set(key, {
    value: data.access_token,
    expires: Date.now() + Number(data.expires_in || 3600) * 1000,
  });
  return String(data.access_token);
}

export const atlasTools: IntegrationTool[] = [
  {
    name: "atlas_list_projects",
    pluginId: "mongodb-atlas",
    label: "Listing projects",
    description: "List Atlas projects (groups) the service account can see.",
    run: async (ctx) =>
      (
        await ctx.fetch(`${ATLAS}/groups`, {
          headers: atlasHeaders,
          query: { itemsPerPage: 100 },
        })
      ).results.map((group: any) => ({
        id: group.id,
        name: group.name,
        clusters: group.clusterCount,
        created: group.created,
      })),
  },
  {
    name: "atlas_list_clusters",
    pluginId: "mongodb-atlas",
    label: "Listing clusters",
    description:
      "List clusters in an Atlas project with tier, version and state.",
    parameters: object(
      { projectId: s("Project (group) id from atlas_list_projects") },
      ["projectId"],
    ),
    run: async (ctx, args) =>
      (
        await ctx.fetch(
          `${ATLAS}/groups/${encodeURIComponent(need(args, "projectId", 100))}/clusters`,
          { headers: atlasHeaders },
        )
      ).results.map((cluster: any) => ({
        name: cluster.name,
        state: cluster.stateName,
        version: cluster.mongoDBVersion,
        type: cluster.clusterType,
        tier: cluster.replicationSpecs?.[0]?.regionConfigs?.[0]?.electableSpecs
          ?.instanceSize,
        provider:
          cluster.replicationSpecs?.[0]?.regionConfigs?.[0]?.providerName,
        connection: cluster.connectionStrings?.standardSrv,
      })),
  },
];

export async function atlasAccount(ctx: ToolContext) {
  const groups = await ctx.fetch(`${ATLAS}/groups`, {
    headers: atlasHeaders,
    query: { itemsPerPage: 1 },
  });
  return {
    label: `${groups.totalCount ?? groups.results?.length ?? 0} Atlas projects`,
    metadata: {},
  };
}

// ---------- Tripo 3D ----------

const TRIPO = "https://api.tripo3d.ai/v2/openapi";
export const tripoTools: IntegrationTool[] = [
  {
    name: "tripo_text_to_model",
    pluginId: "tripo",
    label: "Generating 3D model",
    write: true,
    risk: "low",
    description:
      "Start a text-to-3D generation (spends Tripo credits). Returns a task id; poll with tripo_get_task. Needs the user's confirmation.",
    parameters: object(
      { prompt: s("What to model"), negativePrompt: s("What to avoid") },
      ["prompt"],
    ),
    preview: (args) => ({
      title: "Generate 3D model with Tripo",
      fields: [{ label: "Prompt", value: need(args, "prompt", 1000) }],
    }),
    run: async (ctx, args) => {
      const task = await ctx.fetch(`${TRIPO}/task`, {
        json: {
          type: "text_to_model",
          prompt: need(args, "prompt", 1000),
          negative_prompt: str(args, "negativePrompt", { max: 255 }),
        },
      });
      return {
        taskId: task.data?.task_id,
        next: "Call tripo_get_task with this id until status is success.",
      };
    },
  },
  {
    name: "tripo_get_task",
    pluginId: "tripo",
    label: "Checking 3D generation",
    description:
      "Status and download links of a Tripo task. Model links expire after a few minutes.",
    parameters: object({ taskId: s("Task id") }, ["taskId"]),
    run: async (ctx, args) => {
      const task =
        (
          await ctx.fetch(
            `${TRIPO}/task/${encodeURIComponent(need(args, "taskId", 100))}`,
          )
        ).data || {};
      return {
        status: task.status,
        progress: task.progress,
        model: task.output?.pbr_model || task.output?.model,
        preview: task.output?.rendered_image,
      };
    },
  },
];

export async function tripoAccount(ctx: ToolContext) {
  const balance = await ctx.fetch(`${TRIPO}/user/balance`);
  return {
    label: `Tripo · ${balance.data?.balance ?? "?"} credits`,
    metadata: {},
  };
}
