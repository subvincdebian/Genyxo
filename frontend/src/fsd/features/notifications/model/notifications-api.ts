import { API_BASE_URL } from "@/shared/config";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "SYSTEM" | "SUPPORT" | "INFO";
  isRead: boolean;
  createdAt: string;
  justReceived?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseNotification(
  value: unknown,
  realtime = false,
): NotificationItem {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    typeof value.title !== "string" ||
    typeof value.message !== "string" ||
    (value.type !== "SYSTEM" &&
      value.type !== "SUPPORT" &&
      value.type !== "INFO") ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    !(
      typeof value.isRead === "boolean" ||
      (realtime && value.isRead === undefined)
    )
  ) {
    throw new Error("Invalid notification response");
  }
  return {
    id: value.id,
    title: value.title,
    message: value.message,
    type: value.type,
    createdAt: value.createdAt,
    isRead: value.isRead === true,
    justReceived: realtime,
  };
}

async function request(
  path: string,
  token: string,
  signal: AbortSignal,
  method = "GET",
) {
  const response = await fetch(`${API_BASE_URL}/notifications${path}`, {
    method,
    signal,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Notification request failed");
  return response;
}

export async function getNotifications(
  token: string,
  signal: AbortSignal,
): Promise<NotificationItem[]> {
  const response = await request("", token, signal);
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error("Invalid notifications response");
  return value.map((item) => parseNotification(item));
}

export async function markNotificationRead(
  token: string,
  id: number,
  signal: AbortSignal,
) {
  await request(`/${id}/read`, token, signal, "PATCH");
}

export async function markNotificationsRead(
  token: string,
  signal: AbortSignal,
) {
  await request("/read-all", token, signal, "POST");
}
