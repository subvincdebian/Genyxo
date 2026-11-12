import { IntegrationTool, need, object, s, ToolContext } from "./types";

const LINKEDIN = "https://api.linkedin.com";

export const linkedinTools: IntegrationTool[] = [
  {
    name: "linkedin_profile",
    pluginId: "linkedin",
    label: "Reading profile",
    description: "The signed-in member's name, email and profile picture.",
    run: async (ctx) => ctx.fetch(`${LINKEDIN}/v2/userinfo`),
  },
  {
    name: "linkedin_create_post",
    pluginId: "linkedin",
    label: "Publishing post",
    write: true,
    description:
      "Publish a text post on the member's LinkedIn profile. Needs the user's confirmation.",
    parameters: object(
      {
        text: s("Post text, up to 3000 characters"),
        visibility: { type: "string", enum: ["PUBLIC", "CONNECTIONS"] },
      },
      ["text"],
    ),
    preview: (args) => ({
      title: "Publish LinkedIn post",
      fields: [
        {
          label: "Visibility",
          value: args.visibility === "CONNECTIONS" ? "Connections" : "Anyone",
        },
      ],
      body: need(args, "text", 3000),
    }),
    run: async (ctx, args) => {
      const member = String(
        ctx.metadata.sub || (await ctx.fetch(`${LINKEDIN}/v2/userinfo`)).sub,
      );
      await ctx.fetch(`${LINKEDIN}/rest/posts`, {
        headers: {
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202509",
        },
        json: {
          author: `urn:li:person:${member}`,
          commentary: need(args, "text", 3000),
          visibility:
            args.visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
        },
      });
      return {
        published: true,
        url: "https://www.linkedin.com/in/me/recent-activity/all/",
      };
    },
  },
];

export async function linkedinAccount(ctx: ToolContext) {
  const user = await ctx.fetch(`${LINKEDIN}/v2/userinfo`);
  return {
    label: (user.email || user.name) as string,
    metadata: { sub: user.sub },
  };
}
