import { WORKSPACE_SIGN_IN_MESSAGE } from "@/features/workspace";

export type PluginStatus = "connected" | "available" | "unconfigured" | "expired" | "unavailable";
export interface TokenField { key: string; label: string; placeholder: string; secret: boolean; optional: boolean }
export type PluginAuth =
  | { type: "oauth"; provider: string }
  | { type: "mcp"; provider: string; open: boolean }
  | { type: "token"; fields: TokenField[]; help: string; docsUrl: string }
  | { type: "none" }
  | { type: "unavailable" };
export type ActionPolicy = "ask" | "low-risk";

export interface CatalogPlugin {
  id: string;
  name: string;
  description: string;
  about: string;
  prompts: string[];
  categories: string[];
  categoryNames: string[];
  permissions: string[];
  capabilities: string[];
  apps: { name: string; description: string }[];
  website: string;
  version: string;
  tint: string;
  developer: string;
  auth: PluginAuth;
  authorization: string;
  configured: boolean;
  unavailableReason: string | null;
  status: PluginStatus;
  policy: ActionPolicy;
  connection: { account: string | null; connectedAt: string; scopes: string[]; tools: { name: string; readOnly: boolean }[] } | null;
}
export interface PluginCategory { id: string; name: string; description: string }
export interface IntegrationCatalog { categories: PluginCategory[]; plugins: CatalogPlugin[]; encryptionAvailable: boolean }

/** Plugin connections live under /api/integrations, beside the chat workspace API. */
export async function integrationsRequest<T = unknown>(path = "", init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (!token) throw new Error(WORKSPACE_SIGN_IN_MESSAGE);
  const response = await fetch(`/api/integrations${path ? `/${path.replace(/^\//, "")}` : ""}`, {
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}`, ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || `Request failed (${response.status})`);
  return data as T;
}

export const isInstalled = (plugin: CatalogPlugin) => plugin.status === "connected" || plugin.status === "expired";
/** Connects without leaving Genyxo: no account, or an open MCP server. */
export const connectsInstantly = (plugin: CatalogPlugin) => plugin.auth.type === "none" || (plugin.auth.type === "mcp" && plugin.auth.open);
/** Connects by redirecting to the provider's sign-in. */
export const connectsBySignIn = (plugin: CatalogPlugin) => plugin.auth.type === "oauth" || (plugin.auth.type === "mcp" && !plugin.auth.open);
export const pluginPath = (id: string, settings = false) => `/plugins/${encodeURIComponent(id)}${settings ? "/settings" : ""}`;

/** Short messages for the codes the OAuth callback adds to /plugins. */
export const CONNECT_ERRORS: Record<string, string> = {
  denied: "Access was not granted.",
  expired: "The connection took too long. Try again.",
  session_mismatch: "Finish connecting in the same browser you started in.",
  token_exchange_failed: "The provider did not accept the connection. Try again, or check the app credentials and redirect URI.",
  invalid_state: "This connection link is invalid. Start again from the Plugins page.",
};
