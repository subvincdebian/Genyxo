/**
 * When a scheduled task runs next. Times are wall-clock times in the task's
 * time zone ("every day at 08:00 in Europe/Kyiv"), so daylight saving moves
 * the UTC instant, not the hour the user sees.
 */
export type Repeat = "once" | "daily" | "weekdays" | "weekly" | "monthly";
export const REPEATS: Repeat[] = [
  "once",
  "daily",
  "weekdays",
  "weekly",
  "monthly",
];

export type Schedule = {
  repeat: Repeat;
  /** "HH:MM", 24-hour. */
  time: string;
  /** "YYYY-MM-DD": the day of a one-off task, or the first day of a repeating one. */
  date: string;
};

type Wall = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function isTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock reading of an instant in a time zone. */
export function wallClock(instant: Date, timeZone: string): Wall {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      parts.weekday,
    ),
  };
}

/** The instant a wall-clock time happens in a time zone (the later one in a DST gap). */
export function zonedTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  // Two corrections settle every real offset, DST changes included.
  for (let step = 0; step < 3; step++) {
    const wall = wallClock(new Date(guess), timeZone);
    const seen = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
    );
    if (seen === target) break;
    guess += target - seen;
  }
  return new Date(guess);
}

/** Today's date ("YYYY-MM-DD") in a time zone. */
export function localDate(instant: Date, timeZone: string) {
  const wall = wallClock(instant, timeZone);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

const parseTime = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
};
const parseDate = (date: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCMonth() === month - 1 && check.getUTCDate() === day
    ? { year, month, day }
    : null;
};

export function validSchedule(
  schedule: Partial<Schedule>,
): schedule is Schedule {
  return (
    REPEATS.includes(schedule.repeat as Repeat) &&
    Boolean(parseTime(String(schedule.time || ""))) &&
    Boolean(parseDate(String(schedule.date || "")))
  );
}

/**
 * The first run strictly after `after`, or null when a one-off task has
 * already happened. Monthly tasks on the 31st run on the last day of shorter months.
 */
export function nextRun(
  schedule: Schedule,
  timeZone: string,
  after: Date,
): Date | null {
  const time = parseTime(schedule.time);
  const start = parseDate(schedule.date);
  if (!time || !start) return null;
  const at = (year: number, month: number, day: number) =>
    zonedTime(year, month, day, time.hour, time.minute, timeZone);
  if (schedule.repeat === "once") {
    const run = at(start.year, start.month, start.day);
    return run > after ? run : null;
  }
  const today = wallClock(after, timeZone);
  // Walk days from the later of the start date and today.
  let cursor = Date.UTC(start.year, start.month - 1, start.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  if (todayUtc > cursor) cursor = todayUtc;
  const startWeekday = new Date(
    Date.UTC(start.year, start.month - 1, start.day),
  ).getUTCDay();
  for (let i = 0; i < 400; i++, cursor += 86_400_000) {
    const day = new Date(cursor);
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const date = day.getUTCDate();
    const weekday = day.getUTCDay();
    const lastOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const due =
      schedule.repeat === "daily" ||
      (schedule.repeat === "weekdays" && weekday >= 1 && weekday <= 5) ||
      (schedule.repeat === "weekly" && weekday === startWeekday) ||
      (schedule.repeat === "monthly" &&
        (date === start.day ||
          (date === lastOfMonth && start.day > lastOfMonth)));
    if (!due) continue;
    const run = at(year, month, date);
    if (run > after) return run;
  }
  return null;
}

/** "Every weekday at 08:00" in plain English for the model and the UI fallback. */
export function describeSchedule(schedule: Schedule) {
  const weekday = new Date(`${schedule.date}T12:00:00Z`).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      timeZone: "UTC",
    },
  );
  const day = Number(schedule.date.slice(8));
  switch (schedule.repeat) {
    case "once":
      return `Once on ${schedule.date} at ${schedule.time}`;
    case "daily":
      return `Every day at ${schedule.time}`;
    case "weekdays":
      return `Every weekday at ${schedule.time}`;
    case "weekly":
      return `Every ${weekday} at ${schedule.time}`;
    case "monthly":
      return `Monthly on day ${day} at ${schedule.time}`;
  }
}
