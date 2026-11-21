export interface SidebarConversation {
  id: number;
  title: string;
  lastActivityAt?: string | null;
  updatedAt?: string;
  createdAt: string;
}

export function calendarDay(value: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
  }
  const part = (type: string) =>
    Number(parts.find((entry) => entry.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000;
}

export function groupSidebarConversations<T extends SidebarConversation>(
  items: T[],
  sort: "activity" | "name",
  locale: string,
  timeZone: string,
  labels: { today: string; yesterday: string; week: string; month: string },
  now = new Date(),
): Array<{ key: string; label: string; items: T[] }> {
  const sorted = [...items].sort((a, b) =>
    sort === "name"
      ? a.title.localeCompare(b.title, locale) || a.id - b.id
      : new Date(b.lastActivityAt || b.updatedAt || b.createdAt).getTime() -
          new Date(a.lastActivityAt || a.updatedAt || a.createdAt).getTime() ||
        b.id - a.id,
  );
  if (sort === "name")
    return sorted.length ? [{ key: "all", label: "", items: sorted }] : [];
  const today = calendarDay(now, timeZone);
  const groups = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of sorted) {
    const date = new Date(
      item.lastActivityAt || item.updatedAt || item.createdAt,
    );
    const safe = Number.isNaN(date.getTime()) ? now : date;
    const day = calendarDay(safe, timeZone);
    const difference = today - day;
    let key: string;
    let label: string;
    if (difference <= 0) {
      key = "today";
      label = labels.today;
    } else if (difference === 1) {
      key = "yesterday";
      label = labels.yesterday;
    } else if (difference <= 7) {
      key = "week";
      label = labels.week;
    } else if (difference <= 30) {
      key = "month";
      label = labels.month;
    } else {
      const local = new Date(day * 86_400_000);
      key = `${local.getUTCFullYear()}-${local.getUTCMonth()}`;
      const year = new Date(today * 86_400_000).getUTCFullYear();
      label = new Intl.DateTimeFormat(locale, {
        timeZone: "UTC",
        month: "long",
        ...(year !== local.getUTCFullYear() ? { year: "numeric" } : {}),
      }).format(local);
    }
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()];
}
