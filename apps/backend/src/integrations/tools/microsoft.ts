import { htmlToText } from "../../common/html-text";
import {
  int,
  IntegrationTool,
  list,
  n,
  need,
  object,
  s,
  str,
  ToolContext,
  ToolInputError,
} from "./types";

const GRAPH = "https://graph.microsoft.com/v1.0";
const seg = encodeURIComponent;
const recipients = (value: unknown) =>
  list(value).map((address) => ({ emailAddress: { address } }));
const stripHtml = (html = "") => htmlToText(html);
const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const mailMessage = (args: Record<string, any>) => {
  if (!list(args.to).length) throw new ToolInputError('"to" is required');
  return {
    subject: need(args, "subject", 900),
    body: { contentType: "Text", content: need(args, "body", 100_000) },
    toRecipients: recipients(args.to),
    ccRecipients: recipients(args.cc),
  };
};
const mailPreview = (title: string) => (args: Record<string, any>) => ({
  title,
  fields: [
    { label: "To", value: list(args.to).join(", ") },
    ...(list(args.cc).length
      ? [{ label: "Cc", value: list(args.cc).join(", ") }]
      : []),
    { label: "Subject", value: need(args, "subject", 900) },
  ],
  body: need(args, "body", 100_000),
});
const mailFields = {
  to: s("Recipient addresses, comma separated"),
  cc: s("Cc addresses, comma separated"),
  subject: s("Subject line"),
  body: s("Plain-text body"),
};
const summary = (message: any) => ({
  id: message.id,
  from: message.from?.emailAddress?.address,
  subject: message.subject,
  received: message.receivedDateTime,
  preview: message.bodyPreview,
  unread: message.isRead === false,
  url: message.webLink,
});

export const outlookMailTools: IntegrationTool[] = [
  {
    name: "outlook_search_email",
    pluginId: "outlook-email",
    label: "Searching email",
    description:
      "Search Outlook mail by keywords, or list the newest inbox messages when no query is given.",
    parameters: object({
      query: s("Keywords"),
      limit: n("Maximum messages, up to 25"),
    }),
    run: async (ctx, args) => {
      const query = str(args, "query", { max: 300 });
      const result = await ctx.fetch(`${GRAPH}/me/messages`, {
        query: {
          $top: int(args, "limit", 10, 25),
          $select:
            "id,from,subject,receivedDateTime,bodyPreview,isRead,webLink",
          ...(query
            ? { $search: `"${query.replace(/"/g, "")}"` }
            : { $orderby: "receivedDateTime desc" }),
        },
      });
      return result.value.map(summary);
    },
  },
  {
    name: "outlook_read_email",
    pluginId: "outlook-email",
    label: "Reading email",
    description: "Read one Outlook message with its body.",
    parameters: object({ id: s("Message id from outlook_search_email") }, [
      "id",
    ]),
    run: async (ctx, args) => {
      const message = await ctx.fetch(
        `${GRAPH}/me/messages/${seg(need(args, "id", 500))}`,
        {
          query: {
            $select:
              "id,from,toRecipients,ccRecipients,subject,receivedDateTime,body,webLink",
          },
        },
      );
      return {
        ...summary(message),
        to: message.toRecipients?.map(
          (item: any) => item.emailAddress?.address,
        ),
        cc: message.ccRecipients?.map(
          (item: any) => item.emailAddress?.address,
        ),
        body: (message.body?.contentType === "html"
          ? stripHtml(message.body.content)
          : message.body?.content || ""
        ).slice(0, 12_000),
      };
    },
  },
  {
    name: "outlook_create_draft",
    pluginId: "outlook-email",
    label: "Saving draft",
    write: true,
    risk: "low",
    description:
      "Save an email as an Outlook draft without sending it. Needs the user's confirmation.",
    parameters: object(mailFields, ["to", "subject", "body"]),
    preview: mailPreview("Save Outlook draft"),
    run: async (ctx, args) => {
      const draft = await ctx.fetch(`${GRAPH}/me/messages`, {
        json: mailMessage(args),
      });
      return { id: draft.id, url: draft.webLink };
    },
  },
  {
    name: "outlook_send_email",
    pluginId: "outlook-email",
    label: "Sending email",
    write: true,
    description:
      "Send an email from the user's Outlook. Needs the user's confirmation.",
    parameters: object(mailFields, ["to", "subject", "body"]),
    preview: mailPreview("Send email"),
    run: async (ctx, args) => {
      await ctx.fetch(`${GRAPH}/me/sendMail`, {
        json: { message: mailMessage(args), saveToSentItems: true },
      });
      return { sent: true };
    },
  },
];

const eventFields = {
  subject: s("Event title"),
  start: s("Start, ISO 8601 local date-time"),
  end: s("End, ISO 8601 local date-time"),
  timeZone: s("Windows or IANA time zone, default UTC"),
  attendees: s("Attendee emails, comma separated"),
  location: s("Location"),
  body: s("Description"),
  online: { type: "boolean" as const, description: "Add a Teams meeting link" },
};
const eventBody = (args: Record<string, any>) => {
  const timeZone = str(args, "timeZone", { max: 64 }) || "UTC";
  return {
    subject: str(args, "subject", { max: 500 }),
    start: args.start ? { dateTime: need(args, "start"), timeZone } : undefined,
    end: args.end ? { dateTime: need(args, "end"), timeZone } : undefined,
    location: args.location
      ? { displayName: need(args, "location", 500) }
      : undefined,
    body: args.body
      ? { contentType: "HTML", content: escapeHtml(need(args, "body", 8000)) }
      : undefined,
    attendees:
      args.attendees === undefined
        ? undefined
        : list(args.attendees).map((address) => ({
            emailAddress: { address },
            type: "required",
          })),
    isOnlineMeeting:
      args.online === undefined ? undefined : Boolean(args.online),
  };
};
const eventPreview = (title: string) => (args: Record<string, any>) => ({
  title,
  fields: [
    ...(args.eventId ? [{ label: "Event", value: String(args.eventId) }] : []),
    ...(args.subject ? [{ label: "Title", value: String(args.subject) }] : []),
    ...(args.start
      ? [
          {
            label: "Starts",
            value: `${args.start} (${args.timeZone || "UTC"})`,
          },
        ]
      : []),
    ...(args.end ? [{ label: "Ends", value: String(args.end) }] : []),
    ...(list(args.attendees).length
      ? [{ label: "Guests", value: list(args.attendees).join(", ") }]
      : []),
    ...(args.location
      ? [{ label: "Location", value: String(args.location) }]
      : []),
  ],
  body: str(args, "body"),
});
const simpleEvent = (event: any) => ({
  id: event.id,
  title: event.subject,
  start: event.start?.dateTime,
  end: event.end?.dateTime,
  timeZone: event.start?.timeZone,
  location: event.location?.displayName,
  attendees: event.attendees?.map((item: any) => item.emailAddress?.address),
  url: event.webLink,
  join: event.onlineMeeting?.joinUrl,
});

export const outlookCalendarTools: IntegrationTool[] = [
  {
    name: "outlook_list_events",
    pluginId: "outlook-calendar",
    label: "Listing events",
    description:
      "List Outlook calendar events in a date range (next 14 days by default).",
    parameters: object({
      start: s("Range start, ISO 8601"),
      end: s("Range end, ISO 8601"),
      limit: n("Maximum events, up to 50"),
    }),
    run: async (ctx, args) => {
      const start = str(args, "start") || new Date().toISOString();
      const end =
        str(args, "end") ||
        new Date(Date.parse(start) + 14 * 86_400_000).toISOString();
      const result = await ctx.fetch(`${GRAPH}/me/calendarView`, {
        query: {
          startDateTime: start,
          endDateTime: end,
          $top: int(args, "limit", 25, 50),
          $orderby: "start/dateTime",
          $select:
            "id,subject,start,end,location,attendees,webLink,onlineMeeting",
        },
      });
      return result.value.map(simpleEvent);
    },
  },
  {
    name: "outlook_create_event",
    pluginId: "outlook-calendar",
    label: "Creating event",
    write: true,
    description:
      "Create an Outlook calendar event. Needs the user's confirmation.",
    parameters: object(eventFields, ["subject", "start", "end"]),
    preview: eventPreview("Create calendar event"),
    run: async (ctx, args) =>
      simpleEvent(
        await ctx.fetch(`${GRAPH}/me/events`, { json: eventBody(args) }),
      ),
  },
  {
    name: "outlook_update_event",
    pluginId: "outlook-calendar",
    label: "Updating event",
    write: true,
    description:
      "Change fields of an Outlook calendar event. Needs the user's confirmation.",
    parameters: object(
      { eventId: s("Event id from outlook_list_events"), ...eventFields },
      ["eventId"],
    ),
    preview: eventPreview("Update calendar event"),
    run: async (ctx, args) =>
      simpleEvent(
        await ctx.fetch(
          `${GRAPH}/me/events/${seg(need(args, "eventId", 500))}`,
          { method: "PATCH", json: eventBody(args) },
        ),
      ),
  },
];

export const teamsTools: IntegrationTool[] = [
  {
    name: "teams_list_chats",
    pluginId: "microsoft-teams",
    label: "Listing chats",
    description: "List the user's recent Teams chats with their members.",
    parameters: object({ limit: n("Maximum chats, up to 50") }),
    run: async (ctx, args) => {
      const result = await ctx.fetch(`${GRAPH}/me/chats`, {
        query: { $top: int(args, "limit", 20, 50), $expand: "members" },
      });
      return result.value.map((chat: any) => ({
        id: chat.id,
        topic: chat.topic,
        type: chat.chatType,
        members: chat.members?.map((member: any) => member.displayName),
        url: chat.webUrl,
      }));
    },
  },
  {
    name: "teams_list_channels",
    pluginId: "microsoft-teams",
    label: "Listing channels",
    description: "List teams the user joined and their channels.",
    run: async (ctx) => {
      const teams = (await ctx.fetch(`${GRAPH}/me/joinedTeams`)).value.slice(
        0,
        15,
      );
      return Promise.all(
        teams.map(async (team: any) => ({
          id: team.id,
          name: team.displayName,
          channels: (
            await ctx.fetch(`${GRAPH}/teams/${seg(team.id)}/channels`, {
              query: { $select: "id,displayName" },
            })
          ).value.map((channel: any) => ({
            id: channel.id,
            name: channel.displayName,
          })),
        })),
      );
    },
  },
  {
    name: "teams_send_message",
    pluginId: "microsoft-teams",
    label: "Sending message",
    write: true,
    description:
      "Send a Teams message to a chat (chatId) or a channel (teamId and channelId). Needs the user's confirmation.",
    parameters: object(
      {
        chatId: s("Chat id from teams_list_chats"),
        teamId: s("Team id"),
        channelId: s("Channel id"),
        destination: s(
          "Human-readable chat or channel name for the confirmation card",
        ),
        message: s("Message text"),
      },
      ["message"],
    ),
    preview: (args) => ({
      title: "Send Teams message",
      fields: [
        {
          label: "To",
          value:
            str(args, "destination", { max: 300 }) ||
            (args.chatId ? `Chat ${args.chatId}` : `Channel ${args.channelId}`),
        },
      ],
      body: need(args, "message", 20_000),
    }),
    run: async (ctx, args) => {
      const body = {
        body: {
          contentType: "html",
          content: escapeHtml(need(args, "message", 20_000)).replace(
            /\n/g,
            "<br>",
          ),
        },
      };
      const path = args.chatId
        ? `/chats/${seg(need(args, "chatId", 500))}/messages`
        : args.teamId && args.channelId
          ? `/teams/${seg(need(args, "teamId", 200))}/channels/${seg(need(args, "channelId", 500))}/messages`
          : null;
      if (!path)
        throw new ToolInputError("Give chatId, or teamId and channelId");
      const sent = await ctx.fetch(`${GRAPH}${path}`, { json: body });
      return { id: sent.id, url: sent.webUrl };
    },
  },
];

export async function microsoftAccount(ctx: ToolContext) {
  const user = await ctx.fetch(`${GRAPH}/me`, {
    query: { $select: "displayName,mail,userPrincipalName" },
  });
  return {
    label: (user.mail || user.userPrincipalName || user.displayName) as string,
    metadata: {},
  };
}
