/**
 * The icon and colour a project can show in the sidebar. The web client
 * draws the same names (shared/ui/project-icons); null means the default
 * folder in the default text colour.
 */
export const PROJECT_ICONS = [
  "folder",
  "dollar",
  "book",
  "cap",
  "pencil",
  "pen",
  "code",
  "terminal",
  "music",
  "palette",
  "chart",
  "briefcase",
  "camera",
  "gift",
  "dumbbell",
  "scale",
  "bulb",
  "globe",
  "send",
  "wrench",
  "paw",
  "flask",
  "heart",
  "star",
  "sparkles",
  "home",
  "leaf",
] as const;

export const PROJECT_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

/** Undefined leaves the field alone; null or "" resets it to the default. */
export function projectAppearance(
  value: unknown,
  allowed: readonly string[],
  name: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value))
    throw new Error(`Unknown project ${name}`);
  return value;
}
