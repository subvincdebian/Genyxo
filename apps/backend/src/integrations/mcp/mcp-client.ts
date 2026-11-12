/**
 * Minimal Model Context Protocol client for remote servers over Streamable
 * HTTP: initialize, tools/list and tools/call. One session per server and
 * token is reused for a few minutes.
 */
const PROTOCOL_VERSION = "2025-06-18";
const SESSION_TTL_MS = 10 * 60_000;
const CLIENT_INFO = { name: "Genyxo", version: "1.0.0" };

export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}
export interface McpTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: McpToolAnnotations;
}
export interface McpCallResult {
  content?: { type: string; text?: string; [key: string]: unknown }[];
  structuredContent?: unknown;
  isError?: boolean;
}

export class McpAuthError extends Error {
  constructor(readonly wwwAuthenticate: string | null) {
    super("The MCP server needs a valid sign-in");
  }
}
export class McpError extends Error {}

interface Session {
  id: string | null;
  version: string;
  expires: number;
}
const sessions = new Map<string, Session>();
let nextId = 1;

function sessionKey(url: string, token: string) {
  return `${url}|${token.slice(-16)}`;
}

/** Reads a JSON-RPC response from a JSON body or an SSE stream. */
async function readResponse(response: Response, id: number): Promise<any> {
  const type = response.headers.get("content-type") || "";
  const text = await response.text();
  if (type.includes("text/event-stream")) {
    for (const block of text.split(/\r?\n\r?\n/)) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        const message = JSON.parse(data);
        if (message.id === id) return message;
      } catch {
        // Ignore keep-alives and partial events.
      }
    }
    throw new McpError("The MCP server closed the stream without a response");
  }
  if (!text) return null;
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed.find((item) => item.id === id) : parsed;
}

async function post(
  url: string,
  token: string,
  body: Record<string, unknown>,
  session: Session | null,
  timeoutMs: number,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": session?.version || PROTOCOL_VERSION,
    "User-Agent": "Genyxo-MCP",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (session?.id) headers["Mcp-Session-Id"] = session.id;
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function initialize(url: string, token: string): Promise<Session> {
  const id = nextId++;
  const response = await post(
    url,
    token,
    {
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: CLIENT_INFO,
      },
    },
    null,
    20_000,
  );
  if (response.status === 401 || response.status === 403)
    throw new McpAuthError(response.headers.get("www-authenticate"));
  if (!response.ok) throw new McpError(`MCP server error ${response.status}`);
  const message = await readResponse(response, id);
  if (message?.error)
    throw new McpError(
      String(message.error.message || "MCP initialize failed"),
    );
  const session: Session = {
    id: response.headers.get("mcp-session-id"),
    version: String(message?.result?.protocolVersion || PROTOCOL_VERSION),
    expires: Date.now() + SESSION_TTL_MS,
  };
  await post(
    url,
    token,
    { jsonrpc: "2.0", method: "notifications/initialized" },
    session,
    10_000,
  )
    .then((reply) => reply.body?.cancel())
    .catch(() => undefined);
  return session;
}

/** Sends one JSON-RPC request, starting or renewing the session as needed. */
export async function mcpRequest(
  url: string,
  token: string,
  method: string,
  params: Record<string, unknown>,
  timeoutMs = 60_000,
): Promise<any> {
  const key = sessionKey(url, token);
  for (let attempt = 0; attempt < 2; attempt++) {
    let session = sessions.get(key);
    if (!session || session.expires < Date.now()) {
      session = await initialize(url, token);
      sessions.set(key, session);
    }
    const id = nextId++;
    const response = await post(
      url,
      token,
      { jsonrpc: "2.0", id, method, params },
      session,
      timeoutMs,
    );
    if (response.status === 401 || response.status === 403) {
      sessions.delete(key);
      throw new McpAuthError(response.headers.get("www-authenticate"));
    }
    // An expired session answers 404 (or 400): start a fresh one once.
    if (
      (response.status === 404 || response.status === 400) &&
      session.id &&
      attempt === 0
    ) {
      sessions.delete(key);
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) throw new McpError(`MCP server error ${response.status}`);
    session.expires = Date.now() + SESSION_TTL_MS;
    const message = await readResponse(response, id);
    if (message?.error)
      throw new McpError(
        String(message.error.message || "MCP request failed").slice(0, 400),
      );
    return message?.result;
  }
  throw new McpError("The MCP session could not be restored");
}

export async function mcpListTools(
  url: string,
  token: string,
): Promise<McpTool[]> {
  const tools: McpTool[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const result = await mcpRequest(
      url,
      token,
      "tools/list",
      cursor ? { cursor } : {},
    );
    tools.push(...((result?.tools as McpTool[]) || []));
    cursor = result?.nextCursor;
    if (!cursor) break;
  }
  return tools;
}

export function mcpCallTool(
  url: string,
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  // Generations (images, video, 3D, app builds) can take a while.
  return mcpRequest(
    url,
    token,
    "tools/call",
    { name, arguments: args },
    120_000,
  );
}

/** Flattens a tool result into something a chat model can read. */
export function mcpResultForModel(result: McpCallResult) {
  const parts: string[] = [];
  for (const item of result?.content || []) {
    if (item.type === "text" && typeof item.text === "string")
      parts.push(item.text);
    else if (item.type === "resource_link")
      parts.push(
        `[${typeof item.name === "string" ? item.name : "resource"}](${typeof item.uri === "string" ? item.uri : ""})`,
      );
    else if (
      item.type === "resource" &&
      item.resource &&
      typeof item.resource === "object"
    ) {
      const resource = item.resource as Record<string, unknown>;
      parts.push(
        typeof resource.text === "string"
          ? resource.text
          : `[resource ${typeof resource.uri === "string" ? resource.uri : ""}]`,
      );
    } else if (item.type === "image")
      parts.push("[image returned by the tool]");
  }
  return {
    ...(result?.isError
      ? {
          error:
            parts.join("\n").slice(0, 4000) || "The tool reported an error",
        }
      : {}),
    ...(parts.length && !result?.isError ? { text: parts.join("\n") } : {}),
    ...(result?.structuredContent !== undefined
      ? { data: result.structuredContent }
      : {}),
  };
}

/** Test hook: forget cached sessions. */
export function resetMcpSessions() {
  sessions.clear();
}
