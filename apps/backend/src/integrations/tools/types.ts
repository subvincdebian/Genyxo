/** JSON Schema subset both Gemini function declarations and OpenAI tools accept. */
export interface ToolSchema {
  type: "object" | "string" | "integer" | "number" | "boolean" | "array";
  description?: string;
  properties?: Record<string, ToolSchema>;
  required?: string[];
  items?: ToolSchema;
  enum?: string[];
}

export interface ActionPreview {
  title: string;
  fields: { label: string; value: string }[];
  body?: string;
}

export interface ToolContext {
  token: string;
  metadata: Record<string, unknown>;
  /** Every field the user entered for a token plugin (store domain, client ID…). */
  credentials: Record<string, string>;
  fetch: <T = any>(url: string, init?: ProviderRequest) => Promise<T>;
}

export interface ProviderRequest {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
  /** Return the body as text instead of parsing JSON. */
  text?: boolean;
  /** Skip the default bearer authorization header. */
  noAuth?: boolean;
}

export interface IntegrationTool {
  name: string;
  pluginId: string;
  /** Activity label shown while it runs, e.g. "Listing pull requests". */
  label: string;
  description: string;
  parameters?: ToolSchema;
  /** Writes or sends: runs only after the user confirms the preview. */
  write?: boolean;
  /** "low" writes may skip confirmation when the user allows low-risk actions. */
  risk?: "low" | "high";
  preview?: (args: Record<string, any>) => ActionPreview;
  run: (ctx: ToolContext, args: Record<string, any>) => Promise<unknown>;
}

export class ToolInputError extends Error {}

export function str(
  args: Record<string, any>,
  key: string,
  options: { required?: boolean; max?: number } = {},
): string | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === "") {
    if (options.required) throw new ToolInputError(`"${key}" is required`);
    return undefined;
  }
  const text = typeof value === "string" ? value : String(value);
  if (text.length > (options.max ?? 100_000))
    throw new ToolInputError(`"${key}" is too long`);
  return text;
}
export const need = (args: Record<string, any>, key: string, max?: number) =>
  str(args, key, { required: true, max }) as string;

export function int(
  args: Record<string, any>,
  key: string,
  fallback: number,
  max: number,
): number {
  const value = Number(args[key]);
  return Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), max)
    : fallback;
}

export const list = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : typeof value === "string" && value.trim()
      ? value.split(/[,;]\s*/).filter(Boolean)
      : [];

export const object = (
  properties: Record<string, ToolSchema>,
  required: string[] = [],
): ToolSchema => ({ type: "object", properties, required });
export const s = (description: string): ToolSchema => ({
  type: "string",
  description,
});
export const n = (description: string): ToolSchema => ({
  type: "integer",
  description,
});
export const b = (description: string): ToolSchema => ({
  type: "boolean",
  description,
});
