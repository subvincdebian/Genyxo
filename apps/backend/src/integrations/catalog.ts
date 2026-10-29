/**
 * Plugin catalog types, OAuth app families and categories. The plugins
 * themselves live in ./plugins; tool behaviour lives in ./tools and ./mcp.
 */
export type PluginCategory =
  | "popular"
  | "new"
  | "small-business"
  | "developer"
  | "productivity"
  | "communication"
  | "design"
  | "finance"
  | "entertainment";

export type AuthFamily =
  | "github"
  | "google"
  | "microsoft"
  | "zoom"
  | "spotify"
  | "linkedin";

export interface OAuthFamily {
  id: AuthFamily;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string[];
  clientSecretEnv: string[];
  /** Sends a S256 code challenge; the verifier never leaves the server unencrypted. */
  pkce: boolean;
  /** "basic" sends client credentials as HTTP Basic auth instead of in the body. */
  tokenAuth: "body" | "basic";
  tokenFormat: "form" | "json";
  scopeSeparator: string;
  authorizeParams?: Record<string, string>;
  /** Where the user can create the client ID and secret. */
  consoleUrl: string;
  /** The provider rejects "localhost" redirects: register 127.0.0.1 instead. */
  loopbackRedirect?: boolean;
}

/** OAuth with Genyxo's own registered app at the provider (client ID in .env). */
export interface OAuthAuth {
  type: "oauth";
  family: AuthFamily;
  scopes: string[];
}
/**
 * The provider's official remote MCP server. Genyxo registers itself as an
 * OAuth client automatically (dynamic client registration), so no server
 * keys are needed; `open` servers need no sign-in at all.
 */
export interface McpAuth {
  type: "mcp";
  url: string;
  scopes?: string[];
  open?: boolean;
}
export interface TokenField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  optional?: boolean;
}
/** The user pastes their own key; checked against the provider before saving. */
export interface TokenAuth {
  type: "token";
  fields: TokenField[];
  help: string;
  docsUrl: string;
}
/** Public data or an instruction skill: enabling needs no account. */
export interface NoAuth {
  type: "none";
  /** Server variables the plugin needs, e.g. a developer token. */
  env?: string[];
}
/** The service offers no API a third party may use; shown honestly, never faked. */
export interface UnavailableAuth {
  type: "unavailable";
  reason: string;
}
export type PluginAuth =
  | OAuthAuth
  | McpAuth
  | TokenAuth
  | NoAuth
  | UnavailableAuth;

export interface PluginApp {
  name: string;
  description: string;
}

export interface PluginDefinition {
  id: string;
  name: string;
  /** One line for catalog rows. */
  description: string;
  /** The plugin page's longer, plugin-specific text. */
  about: string;
  /** Three example prompts for the plugin page banner. */
  prompts: string[];
  categories: PluginCategory[];
  auth: PluginAuth;
  /** Plain-language permissions shown before connecting. */
  permissions: string[];
  /** What a chat model can do once the plugin is connected. */
  capabilities: string[];
  /** Connectors the plugin is made of ("Apps" on the plugin page). */
  apps: PluginApp[];
  website: string;
  version: string;
  /** Banner tint for the plugin page. */
  tint: string;
  /** Instruction added to the system prompt while the plugin is enabled. */
  skill?: string;
}

const microsoftTenant = () =>
  process.env.MICROSOFT_INTEGRATION_TENANT || "common";

export const AUTH_FAMILIES: Record<AuthFamily, OAuthFamily> = {
  github: {
    id: "github",
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientIdEnv: ["GITHUB_INTEGRATION_CLIENT_ID"],
    clientSecretEnv: ["GITHUB_INTEGRATION_CLIENT_SECRET"],
    pkce: true,
    tokenAuth: "body",
    tokenFormat: "form",
    scopeSeparator: " ",
    authorizeParams: { allow_signup: "false" },
    consoleUrl: "https://github.com/settings/developers",
  },
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // Sign-in credentials work too once the plugin redirect URI is registered.
    clientIdEnv: ["GOOGLE_INTEGRATION_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    clientSecretEnv: [
      "GOOGLE_INTEGRATION_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET",
    ],
    pkce: true,
    tokenAuth: "body",
    tokenFormat: "form",
    scopeSeparator: " ",
    authorizeParams: {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    },
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
  },
  microsoft: {
    id: "microsoft",
    label: "Microsoft",
    get authorizeUrl() {
      return `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`;
    },
    get tokenUrl() {
      return `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`;
    },
    clientIdEnv: ["MICROSOFT_INTEGRATION_CLIENT_ID"],
    clientSecretEnv: ["MICROSOFT_INTEGRATION_CLIENT_SECRET"],
    pkce: true,
    tokenAuth: "body",
    tokenFormat: "form",
    scopeSeparator: " ",
    authorizeParams: { prompt: "select_account" },
    consoleUrl:
      "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
  },
  zoom: {
    id: "zoom",
    label: "Zoom",
    authorizeUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    clientIdEnv: ["ZOOM_INTEGRATION_CLIENT_ID"],
    clientSecretEnv: ["ZOOM_INTEGRATION_CLIENT_SECRET"],
    pkce: true,
    tokenAuth: "basic",
    tokenFormat: "form",
    scopeSeparator: " ",
    consoleUrl: "https://marketplace.zoom.us/develop/create",
    loopbackRedirect: true,
  },
  spotify: {
    id: "spotify",
    label: "Spotify",
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    clientIdEnv: ["SPOTIFY_INTEGRATION_CLIENT_ID"],
    clientSecretEnv: ["SPOTIFY_INTEGRATION_CLIENT_SECRET"],
    pkce: true,
    tokenAuth: "basic",
    tokenFormat: "form",
    scopeSeparator: " ",
    consoleUrl: "https://developer.spotify.com/dashboard",
    loopbackRedirect: true,
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientIdEnv: ["LINKEDIN_INTEGRATION_CLIENT_ID"],
    clientSecretEnv: ["LINKEDIN_INTEGRATION_CLIENT_SECRET"],
    pkce: false,
    tokenAuth: "body",
    tokenFormat: "form",
    scopeSeparator: " ",
    consoleUrl: "https://www.linkedin.com/developers/apps",
  },
};

export const CATEGORIES: {
  id: PluginCategory;
  name: string;
  description: string;
}[] = [
  {
    id: "popular",
    name: "Popular",
    description: "A collection of useful, notable plugins.",
  },
  {
    id: "new",
    name: "New & noteworthy",
    description: "Recently added plugins worth a look.",
  },
  {
    id: "small-business",
    name: "Small business",
    description: "Run sales, payments, sites and scheduling from chat.",
  },
  {
    id: "developer",
    name: "Developer tools",
    description: "Code, issues, databases and deployments.",
  },
  {
    id: "productivity",
    name: "Productivity",
    description: "Documents, calendars, tasks and notes.",
  },
  {
    id: "communication",
    name: "Communication",
    description: "Email, chat, meetings and networking.",
  },
  {
    id: "design",
    name: "Design & media",
    description: "Designs, references, images, video and 3D.",
  },
  {
    id: "finance",
    name: "Finance & crypto",
    description: "Payments and live market data.",
  },
  {
    id: "entertainment",
    name: "Music & play",
    description: "Music, podcasts and quizzes.",
  },
];

export { PLUGINS, findPlugin } from "./plugins";
