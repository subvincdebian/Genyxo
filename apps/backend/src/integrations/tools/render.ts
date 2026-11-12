import { int, IntegrationTool, n, need, object, s, ToolContext } from "./types";

const seg = encodeURIComponent;

const RENDER = "https://api.render.com/v1";
export const renderTools: IntegrationTool[] = [
  {
    name: "render_list_services",
    pluginId: "render",
    label: "Listing services",
    description: "List Render services.",
    parameters: object({ limit: n("Maximum services, up to 100") }),
    run: async (ctx, args) =>
      (
        await ctx.fetch<any[]>(`${RENDER}/services`, {
          query: { limit: int(args, "limit", 20, 100) },
        })
      ).map(({ service }) => ({
        id: service.id,
        name: service.name,
        type: service.type,
        suspended: service.suspended,
        url: service.serviceDetails?.url,
        dashboard: service.dashboardUrl,
        updated: service.updatedAt,
      })),
  },
  {
    name: "render_list_deploys",
    pluginId: "render",
    label: "Listing deploys",
    description: "List recent deploys of a Render service.",
    parameters: object(
      {
        serviceId: s("Service id from render_list_services"),
        limit: n("Maximum deploys, up to 50"),
      },
      ["serviceId"],
    ),
    run: async (ctx, args) =>
      (
        await ctx.fetch<any[]>(
          `${RENDER}/services/${seg(need(args, "serviceId", 100))}/deploys`,
          { query: { limit: int(args, "limit", 10, 50) } },
        )
      ).map(({ deploy }) => ({
        id: deploy.id,
        status: deploy.status,
        trigger: deploy.trigger,
        commit: deploy.commit?.message?.slice(0, 200),
        created: deploy.createdAt,
        finished: deploy.finishedAt,
      })),
  },
  {
    name: "render_get_deploy",
    pluginId: "render",
    label: "Reading deploy status",
    description: "Read one Render deploy's status.",
    parameters: object(
      { serviceId: s("Service id"), deployId: s("Deploy id") },
      ["serviceId", "deployId"],
    ),
    run: async (ctx, args) => {
      const deploy = await ctx.fetch(
        `${RENDER}/services/${seg(need(args, "serviceId", 100))}/deploys/${seg(need(args, "deployId", 100))}`,
      );
      return {
        id: deploy.id,
        status: deploy.status,
        trigger: deploy.trigger,
        commit: deploy.commit?.message?.slice(0, 200),
        created: deploy.createdAt,
        finished: deploy.finishedAt,
      };
    },
  },
];

export async function renderAccount(ctx: ToolContext) {
  const owners = await ctx.fetch<any[]>(`${RENDER}/owners`, {
    query: { limit: 1 },
  });
  return {
    label: (owners[0]?.owner?.email ||
      owners[0]?.owner?.name ||
      "Render") as string,
    metadata: {},
  };
}
