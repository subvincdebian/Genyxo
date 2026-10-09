import { API_BASE_URL } from "@/shared/config";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  adminResponse: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
}

export function isTicketPriority(value: string): value is TicketPriority {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseTicket(value: unknown): SupportTicket {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    typeof value.subject !== "string" ||
    typeof value.message !== "string" ||
    (typeof value.adminResponse !== "string" &&
      value.adminResponse !== null &&
      value.adminResponse !== undefined) ||
    (value.status !== "OPEN" &&
      value.status !== "IN_PROGRESS" &&
      value.status !== "CLOSED") ||
    typeof value.priority !== "string" ||
    !isTicketPriority(value.priority) ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    throw new Error("Invalid support ticket response");
  }
  return {
    id: value.id,
    subject: value.subject,
    message: value.message,
    status: value.status,
    priority: value.priority,
    createdAt: value.createdAt,
    adminResponse: value.adminResponse ?? null,
  };
}

export async function getTickets(
  token: string,
  signal: AbortSignal,
): Promise<SupportTicket[]> {
  const response = await fetch(`${API_BASE_URL}/support/my-tickets`, {
    signal,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Ticket request failed");
  const value: unknown = await response.json();
  if (!Array.isArray(value))
    throw new Error("Invalid support tickets response");
  return value.map((item) => parseTicket(item));
}

export async function postTicket(
  token: string,
  signal: AbortSignal,
  subject: string,
  message: string,
  priority: TicketPriority,
) {
  const response = await fetch(`${API_BASE_URL}/support/create`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ subject, message, priority }),
  });
  if (!response.ok) throw new Error("Ticket creation failed");
}
