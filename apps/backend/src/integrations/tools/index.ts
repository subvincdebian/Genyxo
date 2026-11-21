import {
  atlasAccount,
  atlasTools,
  shopifyAccount,
  shopifyTools,
  tripoAccount,
  tripoTools,
} from "./business";
import { githubAccount, githubTools } from "./github";
import { calendarTools, driveTools, gmailTools, googleAccount } from "./google";
import { linkedinAccount, linkedinTools } from "./linkedin";
import {
  microsoftAccount,
  outlookCalendarTools,
  outlookMailTools,
  teamsTools,
} from "./microsoft";
import { appleMusicTools, spotifyAccount, spotifyTools } from "./music";
import { binanceTools, bybitTools, stackOverflowTools } from "./public-data";
import { rawApiTools } from "./raw-api";
import { renderAccount, renderTools } from "./render";
import type { IntegrationTool, ToolContext } from "./types";
import { zoomAccount, zoomTools } from "./zoom";

export * from "./types";
export { providerFetch, ProviderError } from "./http";
export { rawCallPreview, rawCallWrites } from "./raw-api";

/** Genyxo's own REST tools. MCP plugins get theirs from the provider's server. */
export const ALL_TOOLS: IntegrationTool[] = [
  ...githubTools,
  ...gmailTools,
  ...driveTools,
  ...calendarTools,
  ...outlookMailTools,
  ...outlookCalendarTools,
  ...teamsTools,
  ...renderTools,
  ...zoomTools,
  ...spotifyTools,
  ...appleMusicTools,
  ...linkedinTools,
  ...shopifyTools,
  ...atlasTools,
  ...tripoTools,
  ...stackOverflowTools,
  ...binanceTools,
  ...bybitTools,
  ...rawApiTools,
];

export const findTool = (name: string) =>
  ALL_TOOLS.find((tool) => tool.name === name);

type Account = { label: string; metadata: Record<string, unknown> };
const ACCOUNTS: Record<string, (ctx: ToolContext) => Promise<Account>> = {
  github: githubAccount,
  gmail: googleAccount,
  "google-drive": googleAccount,
  "google-calendar": googleAccount,
  "outlook-email": microsoftAccount,
  "outlook-calendar": microsoftAccount,
  "microsoft-teams": microsoftAccount,
  render: renderAccount,
  zoom: zoomAccount,
  spotify: spotifyAccount,
  linkedin: linkedinAccount,
  shopify: shopifyAccount,
  "mongodb-atlas": atlasAccount,
  tripo: tripoAccount,
};

/** Who the linked account is, shown on the plugin settings page. */
export function describeAccount(
  pluginId: string,
  ctx: ToolContext,
): Promise<Account> {
  const lookup = ACCOUNTS[pluginId];
  return lookup ? lookup(ctx) : Promise.resolve({ label: "", metadata: {} });
}
