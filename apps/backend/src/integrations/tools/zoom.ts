import {
  int,
  IntegrationTool,
  n,
  need,
  object,
  s,
  str,
  ToolContext,
} from "./types";

const ZOOM = "https://api.zoom.us/v2";
export const zoomTools: IntegrationTool[] = [
  {
    name: "zoom_list_meetings",
    pluginId: "zoom",
    label: "Listing meetings",
    description: "List the user's upcoming Zoom meetings.",
    parameters: object({ limit: n("Maximum meetings, up to 50") }),
    run: async (ctx, args) =>
      (
        await ctx.fetch(`${ZOOM}/users/me/meetings`, {
          query: { type: "upcoming", page_size: int(args, "limit", 20, 50) },
        })
      ).meetings.map((meeting: any) => ({
        id: meeting.id,
        topic: meeting.topic,
        start: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join: meeting.join_url,
      })),
  },
  {
    name: "zoom_create_meeting",
    pluginId: "zoom",
    label: "Creating meeting",
    write: true,
    description: "Schedule a Zoom meeting. Needs the user's confirmation.",
    parameters: object(
      {
        topic: s("Meeting topic"),
        start: s("Start, ISO 8601 date-time"),
        duration: n("Length in minutes"),
        timezone: s("IANA time zone"),
        agenda: s("Agenda"),
      },
      ["topic", "start"],
    ),
    preview: (args) => ({
      title: "Create Zoom meeting",
      fields: [
        { label: "Topic", value: need(args, "topic", 200) },
        {
          label: "Starts",
          value: `${need(args, "start")}${args.timezone ? ` (${args.timezone})` : ""}`,
        },
        { label: "Duration", value: `${int(args, "duration", 30, 1440)} min` },
      ],
      body: str(args, "agenda"),
    }),
    run: async (ctx, args) => {
      const meeting = await ctx.fetch(`${ZOOM}/users/me/meetings`, {
        json: {
          topic: need(args, "topic", 200),
          type: 2,
          start_time: need(args, "start", 64),
          duration: int(args, "duration", 30, 1440),
          timezone: str(args, "timezone", { max: 64 }),
          agenda: str(args, "agenda", { max: 2000 }),
        },
      });
      return {
        id: meeting.id,
        start: meeting.start_time,
        url: meeting.join_url,
      };
    },
  },
];

export async function zoomAccount(ctx: ToolContext) {
  const user = await ctx.fetch(`${ZOOM}/users/me`);
  return { label: user.email as string, metadata: {} };
}
