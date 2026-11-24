/**
 * Pure helpers for searching the user's past chats: time ranges said in
 * words ("last month", "на прошлой неделе"), search terms with simple stems,
 * and ranking.
 */

export interface TimeRange {
  from?: Date;
  to?: Date;
  label?: string;
}

const day = 86_400_000;
const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** A date range named in the question, relative to `now`. */
export function timeRange(question: string, now = new Date()): TimeRange {
  const text = question.toLowerCase();
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(
    today.getTime() - ((today.getDay() + 6) % 7) * day,
  );
  if (/\b(today)\b|сегодня/u.test(text)) return { from: today, label: "today" };
  if (/\b(yesterday)\b|вчера/u.test(text))
    return {
      from: new Date(today.getTime() - day),
      to: today,
      label: "yesterday",
    };
  if (/\blast week\b|прошл\p{L}* недел/u.test(text))
    return {
      from: new Date(weekStart.getTime() - 7 * day),
      to: weekStart,
      label: "last week",
    };
  if (/\bthis week\b|эт\p{L}* недел/u.test(text))
    return { from: weekStart, label: "this week" };
  if (/\blast month\b|прошл\p{L}* месяц/u.test(text))
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: monthStart,
      label: "last month",
    };
  if (/\bthis month\b|эт\p{L}* месяц/u.test(text))
    return { from: monthStart, label: "this month" };
  const ago =
    /(\d{1,3})\s*(days?|weeks?|дн\p{L}*|недел\p{L}*)\s*(ago|назад)/u.exec(text);
  if (ago) {
    const count = Number(ago[1]) * (/^(w|н)/.test(ago[2]) ? 7 : 1);
    return {
      from: new Date(today.getTime() - (count + 1) * day),
      label: `${ago[1]} ${ago[2]} ago`,
    };
  }
  return {};
}

const STOP = new Set(
  (
    "the and for are was were what when where which who why how did does do our we you your with about from that this have has had been can could would should will into over just than then them they their there these those last month week year today yesterday ago chat chats conversation said told decide decided discuss discussed talk talked " +
    "что как где когда кто почему зачем какой какая какие который это этот эта эти тот там тут мы вы ты они он она оно наш наши ваш мне меня нам нас был была были было есть про для или если чтобы тоже также уже еще ещё очень прошлом прошлой прошлый месяц месяце неделе неделю сегодня вчера чат чате чатах разговор решили обсуждали говорили сказал сказали"
  ).split(" "),
);

/** Content words of a question; Russian words are cut to a stem for LIKE. */
export function searchTerms(question: string) {
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(
      (word) => (word.length > 2 || /^\d+$/.test(word)) && !STOP.has(word),
    );
  const stems = words.map((word) =>
    /[а-яё]/.test(word) && word.length > 5
      ? word.slice(0, Math.max(4, word.length - 2))
      : word,
  );
  return [...new Set(stems)].slice(0, 8);
}

/** How well a message matches the terms, with a small bonus for recency. */
export function scoreMessage(
  content: string,
  terms: string[],
  createdAt: Date,
  now = Date.now(),
) {
  const text = content.toLowerCase();
  const hits = terms.filter((term) => text.includes(term)).length;
  if (!hits) return 0;
  const ageDays = Math.max(0, (now - createdAt.getTime()) / day);
  return hits * 10 + (hits / terms.length) * 5 + Math.max(0, 3 - ageDays / 60);
}

/** A short excerpt around the first matching term. */
export function snippetAround(content: string, terms: string[], size = 260) {
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    // Links and emphasis read as plain words in a snippet.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = text.toLowerCase();
  const at =
    terms
      .map((term) => lower.indexOf(term))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - Math.floor(size / 3));
  const slice = text.slice(start, start + size);
  return `${start > 0 ? "…" : ""}${slice}${start + size < text.length ? "…" : ""}`;
}
