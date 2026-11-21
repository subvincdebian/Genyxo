/**
 * MCP input schemas are full JSON Schema; Gemini function declarations accept
 * only an OpenAPI subset. This keeps type, description, properties, required,
 * items, enum and nullable, and folds unions to their first concrete type.
 */
type Schema = Record<string, any>;
const TYPES = new Set([
  "object",
  "string",
  "integer",
  "number",
  "boolean",
  "array",
]);

export function geminiSchema(schema: unknown, depth = 0): Schema {
  if (!schema || typeof schema !== "object" || depth > 8)
    return { type: "string" };
  const source = schema as Schema;
  const variant = [source.anyOf, source.oneOf, source.allOf]
    .find(Array.isArray)
    ?.find((item: Schema) => item && item.type !== "null");
  if (variant && !source.type)
    return {
      ...geminiSchema(variant, depth + 1),
      ...(source.description
        ? { description: String(source.description).slice(0, 1000) }
        : {}),
    };
  let type = Array.isArray(source.type)
    ? source.type.find((item: string) => item !== "null")
    : source.type;
  const nullable = Array.isArray(source.type) && source.type.includes("null");
  if (!TYPES.has(type))
    type = source.properties ? "object" : source.items ? "array" : "string";
  const out: Schema = { type };
  if (source.description)
    out.description = String(source.description).slice(0, 1000);
  if (nullable) out.nullable = true;
  if (Array.isArray(source.enum) && type === "string")
    out.enum = source.enum.filter((item: unknown) => typeof item === "string");
  if (type === "array")
    out.items = geminiSchema(source.items || { type: "string" }, depth + 1);
  if (type === "object") {
    const properties = Object.entries(
      (source.properties as Schema) || {},
    ).slice(0, 60);
    if (properties.length) {
      out.properties = Object.fromEntries(
        properties.map(([key, value]) => [key, geminiSchema(value, depth + 1)]),
      );
      const required = Array.isArray(source.required)
        ? source.required.filter((key: string) => key in out.properties)
        : [];
      if (required.length) out.required = required;
    } else if (depth > 0) {
      // Gemini rejects empty nested objects; accept them as JSON text instead.
      return {
        type: "string",
        description: `${out.description ? `${out.description} ` : ""}(JSON object)`,
      };
    }
  }
  return out;
}

/** OpenAI-style tools take JSON Schema directly; only drop meta keys. */
export function openAiSchema(schema: unknown): Schema {
  if (!schema || typeof schema !== "object")
    return { type: "object", properties: {} };
  const { $schema: _schema, $id: _id, ...rest } = schema as Schema;
  return rest.type === "object" ? rest : { type: "object", properties: {} };
}

/** Undo the JSON-text fallback for nested objects Gemini could not declare. */
export function reviveArgs(
  args: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  const properties = ((schema as Schema)?.properties as Schema) || {};
  const out: Record<string, unknown> = { ...args };
  for (const [key, value] of Object.entries(out)) {
    const expected = properties[key];
    if (
      typeof value === "string" &&
      expected &&
      (expected.type === "object" ||
        (Array.isArray(expected.type) && expected.type.includes("object")))
    ) {
      try {
        out[key] = JSON.parse(value);
      } catch {
        // Leave it; the server reports a precise error.
      }
    }
  }
  return out;
}
