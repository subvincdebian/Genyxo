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

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const DRIVE = "https://www.googleapis.com/drive/v3";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary";

const header = (message: any, name: string) =>
  message.payload?.headers?.find(
    (item: any) => item.name.toLowerCase() === name.toLowerCase(),
  )?.value;
const decode = (data = "") => Buffer.from(data, "base64url").toString("utf8");
const stripHtml = (html = "") => htmlToText(html);

function bodyText(part: any): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data)
    return decode(part.body.data);
  for (const child of part.parts || []) {
    const text = bodyText(child);
    if (text) return text;
  }
  if (part.mimeType === "text/html" && part.body?.data)
    return stripHtml(decode(part.body.data));
  return "";
}

const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
const address = (value: string) => {
  // Header injection guard: one line per header, plain addresses only.
  if (/[\r\n]/.test(value))
    throw new ToolInputError("Addresses cannot contain line breaks");
  return value;
};

export function buildMimeMessage(args: Record<string, any>): string {
  const to = list(args.to).map(address);
  if (!to.length) throw new ToolInputError('"to" is required');
  const cc = list(args.cc).map(address);
  const subject = need(args, "subject", 900).replace(/[\r\n]+/g, " ");
  const lines = [
    `To: ${to.join(", ")}`,
    ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    ...(args.inReplyTo
      ? [
          `In-Reply-To: ${address(String(args.inReplyTo))}`,
          `References: ${address(String(args.inReplyTo))}`,
        ]
      : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(need(args, "body", 100_000), "utf8").toString("base64"),
  ];
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

const emailPreview = (title: string) => (args: Record<string, any>) => ({
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
const emailFields = {
  to: s("Recipient addresses, comma separated"),
  cc: s("Cc addresses, comma separated"),
  subject: s("Subject line"),
  body: s("Plain-text body"),
};

export const gmailTools: IntegrationTool[] = [
  {
    name: "gmail_search",
    pluginId: "gmail",
    label: "Searching email",
    description:
      "Search Gmail with Gmail search syntax (e.g. 'from:anna is:unread newer_than:7d'). Returns sender, subject, date and snippet.",
    parameters: object({
      query: s("Gmail search query"),
      limit: n("Maximum messages, up to 25"),
    }),
    run: async (ctx, args) => {
      const found = await ctx.fetch(`${GMAIL}/messages`, {
        query: {
          q: str(args, "query", { max: 500 }),
          maxResults: int(args, "limit", 10, 25),
        },
      });
      const messages = await Promise.all(
        (found.messages || []).map((item: any) =>
          // metadataHeaders is a repeated parameter, so it is spelled out in the URL.
          ctx
            .fetch(
              `${GMAIL}/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
            )
            .then((message) => ({
              id: message.id,
              threadId: message.threadId,
              from: header(message, "From"),
              to: header(message, "To"),
              subject: header(message, "Subject"),
              date: header(message, "Date"),
              snippet: message.snippet,
              unread: message.labelIds?.includes("UNREAD"),
            })),
        ),
      );
      return { messages };
    },
  },
  {
    name: "gmail_read",
    pluginId: "gmail",
    label: "Reading email",
    description: "Read one Gmail message by id, including its plain-text body.",
    parameters: object({ id: s("Message id from gmail_search") }, ["id"]),
    run: async (ctx, args) => {
      const message = await ctx.fetch(
        `${GMAIL}/messages/${encodeURIComponent(need(args, "id", 200))}`,
        { query: { format: "full" } },
      );
      return {
        id: message.id,
        threadId: message.threadId,
        messageId: header(message, "Message-ID"),
        from: header(message, "From"),
        to: header(message, "To"),
        cc: header(message, "Cc"),
        subject: header(message, "Subject"),
        date: header(message, "Date"),
        body: bodyText(message.payload).slice(0, 12_000),
      };
    },
  },
  {
    name: "gmail_create_draft",
    pluginId: "gmail",
    label: "Saving draft",
    write: true,
    risk: "low",
    description:
      "Save an email as a Gmail draft without sending it. Needs the user's confirmation.",
    parameters: object(emailFields, ["to", "subject", "body"]),
    preview: emailPreview("Save Gmail draft"),
    run: async (ctx, args) => {
      const draft = await ctx.fetch(`${GMAIL}/drafts`, {
        json: { message: { raw: buildMimeMessage(args) } },
      });
      return {
        draftId: draft.id,
        url: "https://mail.google.com/mail/u/0/#drafts",
      };
    },
  },
  {
    name: "gmail_send",
    pluginId: "gmail",
    label: "Sending email",
    write: true,
    description:
      "Send an email from the user's Gmail. Needs the user's confirmation.",
    parameters: object(
      {
        ...emailFields,
        threadId: s("Thread id when replying"),
        inReplyTo: s("Message-ID header of the message being answered"),
      },
      ["to", "subject", "body"],
    ),
    preview: emailPreview("Send email"),
    run: async (ctx, args) => {
      const sent = await ctx.fetch(`${GMAIL}/messages/send`, {
        json: { raw: buildMimeMessage(args), threadId: str(args, "threadId") },
      });
      return {
        id: sent.id,
        url: `https://mail.google.com/mail/u/0/#sent/${sent.id}`,
      };
    },
  },
];

const EXPORTS: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};
const quote = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export const driveTools: IntegrationTool[] = [
  {
    name: "gdrive_search",
    pluginId: "google-drive",
    label: "Searching Drive",
    description: "Search Google Drive files by name or full text.",
    parameters: object(
      { query: s("Words to look for"), limit: n("Maximum files, up to 25") },
      ["query"],
    ),
    run: async (ctx, args) => {
      const text = quote(need(args, "query", 300));
      const result = await ctx.fetch(`${DRIVE}/files`, {
        query: {
          q: `(name contains '${text}' or fullText contains '${text}') and trashed = false`,
          pageSize: int(args, "limit", 10, 25),
          fields:
            "files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName))",
          orderBy: "modifiedTime desc",
        },
      });
      return result.files;
    },
  },
  {
    name: "gdrive_read",
    pluginId: "google-drive",
    label: "Reading file",
    description:
      "Read the text of a Drive file: Docs and Slides as text, Sheets as CSV, plain text files as they are.",
    parameters: object({ fileId: s("File id from gdrive_search") }, ["fileId"]),
    run: async (ctx, args) => {
      const id = encodeURIComponent(need(args, "fileId", 200));
      const meta = await ctx.fetch(`${DRIVE}/files/${id}`, {
        query: { fields: "id,name,mimeType,size,webViewLink" },
      });
      const exportType = EXPORTS[meta.mimeType];
      if (
        !exportType &&
        !/^(text\/|application\/(json|xml|csv))/.test(meta.mimeType)
      )
        return {
          ...meta,
          content: null,
          note: "Binary file: content is not readable as text",
        };
      if (!exportType && Number(meta.size) > 2_000_000)
        return { ...meta, content: null, note: "File is larger than 2 MB" };
      const content = await ctx.fetch<string>(
        exportType ? `${DRIVE}/files/${id}/export` : `${DRIVE}/files/${id}`,
        {
          query: exportType ? { mimeType: exportType } : { alt: "media" },
          text: true,
        },
      );
      return {
        ...meta,
        content: content.slice(0, 20_000),
        truncated: content.length > 20_000,
      };
    },
  },
  {
    name: "gdrive_upload",
    pluginId: "google-drive",
    label: "Uploading file",
    write: true,
    description:
      "Upload a new text file to Google Drive. Needs the user's confirmation.",
    parameters: object(
      {
        name: s("File name with extension"),
        content: s("Text content"),
        mimeType: s("MIME type, default text/plain"),
      },
      ["name", "content"],
    ),
    preview: (args) => ({
      title: "Upload to Google Drive",
      fields: [{ label: "File", value: need(args, "name", 300) }],
      body: need(args, "content", 1_000_000),
    }),
    run: async (ctx, args) => {
      const boundary = `gx${Date.now().toString(36)}`;
      const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify({ name: need(args, "name", 300) }),
        `--${boundary}`,
        `Content-Type: ${str(args, "mimeType", { max: 100 }) || "text/plain"}; charset=UTF-8`,
        "",
        need(args, "content", 1_000_000),
        `--${boundary}--`,
      ].join("\r\n");
      const file = await ctx.fetch(
        "https://www.googleapis.com/upload/drive/v3/files",
        {
          method: "POST",
          query: { uploadType: "multipart", fields: "id,name,webViewLink" },
          body,
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
        },
      );
      return { id: file.id, name: file.name, url: file.webViewLink };
    },
  },
];

const eventFields = {
  summary: s("Event title"),
  start: s("Start as ISO 8601 date-time, or YYYY-MM-DD for all-day"),
  end: s("End as ISO 8601 date-time, or YYYY-MM-DD for all-day"),
  timeZone: s("IANA time zone, e.g. Europe/Prague"),
  attendees: s("Attendee emails, comma separated"),
  location: s("Location"),
  description: s("Description"),
};
const when = (value: string | undefined, timeZone?: string) =>
  value === undefined
    ? undefined
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? { date: value }
      : { dateTime: value, timeZone };
function eventBody(args: Record<string, any>) {
  const timeZone = str(args, "timeZone", { max: 64 });
  return {
    summary: str(args, "summary", { max: 500 }),
    location: str(args, "location", { max: 500 }),
    description: str(args, "description", { max: 8000 }),
    start: when(str(args, "start"), timeZone),
    end: when(str(args, "end"), timeZone),
    attendees:
      args.attendees === undefined
        ? undefined
        : list(args.attendees).map((email) => ({ email })),
  };
}
const eventPreview = (title: string) => (args: Record<string, any>) => ({
  title,
  fields: [
    ...(args.eventId ? [{ label: "Event", value: String(args.eventId) }] : []),
    ...(args.summary ? [{ label: "Title", value: String(args.summary) }] : []),
    ...(args.start
      ? [
          {
            label: "Starts",
            value: `${args.start}${args.timeZone ? ` (${args.timeZone})` : ""}`,
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
  body: str(args, "description"),
});
const simpleEvent = (event: any) => ({
  id: event.id,
  title: event.summary,
  start: event.start?.dateTime || event.start?.date,
  end: event.end?.dateTime || event.end?.date,
  location: event.location,
  attendees: event.attendees?.map((item: any) => item.email),
  url: event.htmlLink,
  meet: event.hangoutLink,
});

export const calendarTools: IntegrationTool[] = [
  {
    name: "gcal_list_events",
    pluginId: "google-calendar",
    label: "Listing events",
    description:
      "List events from the user's primary Google Calendar, from now by default.",
    parameters: object({
      timeMin: s("Start of range, ISO 8601"),
      timeMax: s("End of range, ISO 8601"),
      query: s("Free-text filter"),
      limit: n("Maximum events, up to 50"),
    }),
    run: async (ctx, args) => {
      const result = await ctx.fetch(`${CALENDAR}/events`, {
        query: {
          singleEvents: true,
          orderBy: "startTime",
          timeMin: str(args, "timeMin") || new Date().toISOString(),
          timeMax: str(args, "timeMax"),
          q: str(args, "query", { max: 200 }),
          maxResults: int(args, "limit", 20, 50),
        },
      });
      return {
        timeZone: result.timeZone,
        events: result.items.map(simpleEvent),
      };
    },
  },
  {
    name: "gcal_create_event",
    pluginId: "google-calendar",
    label: "Creating event",
    write: true,
    description:
      "Create an event in the primary Google Calendar. Needs the user's confirmation.",
    parameters: object(eventFields, ["summary", "start", "end"]),
    preview: eventPreview("Create calendar event"),
    run: async (ctx, args) =>
      simpleEvent(
        await ctx.fetch(`${CALENDAR}/events`, { json: eventBody(args) }),
      ),
  },
  {
    name: "gcal_update_event",
    pluginId: "google-calendar",
    label: "Updating event",
    write: true,
    description:
      "Change fields of an existing Google Calendar event. Needs the user's confirmation.",
    parameters: object(
      { eventId: s("Event id from gcal_list_events"), ...eventFields },
      ["eventId"],
    ),
    preview: eventPreview("Update calendar event"),
    run: async (ctx, args) =>
      simpleEvent(
        await ctx.fetch(
          `${CALENDAR}/events/${encodeURIComponent(need(args, "eventId", 300))}`,
          { method: "PATCH", json: eventBody(args) },
        ),
      ),
  },
];

export async function googleAccount(ctx: ToolContext) {
  const user = await ctx.fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
  );
  return { label: user.email as string, metadata: { email: user.email } };
}
