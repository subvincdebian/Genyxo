import fastJson from "fast-json-stringify";

export interface TokenEventPayload {
  token: string;
  conversationId: number;
}

export interface ConversationEventPayload {
  status: string;
  conversationId: number;
  conversationTitle?: string;
}

export interface DoneEventPayload {
  status: string;
  messageId: number;
  creditBalance: number;
}

export interface ErrorEventPayload {
  error: string;
}

export interface ActivityEventPayload {
  status: "activity";
  step: string;
  sources?: string[];
}

export const stringifyTokenEvent = fastJson({
  title: "TokenEvent",
  type: "object",
  properties: {
    token: { type: "string" },
    conversationId: { type: "integer" },
  },
  required: ["token", "conversationId"],
});

export const stringifyConversationEvent = fastJson({
  title: "ConversationEvent",
  type: "object",
  properties: {
    status: { type: "string" },
    conversationId: { type: "integer" },
    conversationTitle: { type: "string" },
  },
  required: ["status", "conversationId"],
});

export const stringifyDoneEvent = fastJson({
  title: "DoneEvent",
  type: "object",
  properties: {
    status: { type: "string" },
    messageId: { type: "integer" },
    creditBalance: { type: "number" },
  },
  required: ["status", "messageId", "creditBalance"],
});

export const stringifyErrorEvent = fastJson({
  title: "ErrorEvent",
  type: "object",
  properties: {
    error: { type: "string" },
    // Set when the failed turn was rolled back: null means the new chat was removed.
    conversationId: { type: "integer", nullable: true },
    rolledBack: { type: "boolean" },
  },
  required: ["error"],
});

export const stringifyActivityEvent = fastJson({
  title: "ActivityEvent",
  type: "object",
  properties: {
    status: { type: "string" },
    step: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
  },
  required: ["status", "step"],
});
