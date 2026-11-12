import {
  applyAppearance,
  clearAppearance,
  defaultAppearance,
  readAppearance,
} from "./appearance";

export type Theme = "system" | "light" | "dark";
export type WorkspaceTheme = "your" | "light" | "dark";
const workspaceKey = "genyxo.workspace.theme";
export const isWorkspacePath = (path: string) =>
  /^\/(chat|c|library|plugins|scheduled|maps)(\/|$)/.test(path);
export function readAccountTheme(): Theme {
  try {
    const value = localStorage.getItem("theme");
    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}
export function readWorkspaceTheme(): WorkspaceTheme {
  try {
    const value = localStorage.getItem(workspaceKey);
    return value === "dark" || value === "light" ? value : "your";
  } catch {
    return "your";
  }
}
export function paintSiteAppearance() {
  if (location.pathname === "/") {
    clearAppearance();
    return;
  }
  const preference = readAppearance();
  const override =
    isWorkspacePath(location.pathname) && readWorkspaceTheme() !== "your";
  applyAppearance(
    override
      ? {
          ...preference,
          light: defaultAppearance.light,
          dark: defaultAppearance.dark,
        }
      : preference,
  );
}
export function syncSiteTheme() {
  if (location.pathname === "/") {
    clearAppearance();
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  const selected = isWorkspacePath(location.pathname)
    ? readWorkspaceTheme()
    : "your";
  const mode = selected === "your" ? readAccountTheme() : selected;
  const resolved =
    mode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  if (document.documentElement.dataset.theme !== resolved)
    document.documentElement.dataset.theme = resolved;
  paintSiteAppearance();
}
export function setAccountTheme(value: Theme) {
  try {
    if (value === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", value);
  } catch {
    /* Presentation still works when browser storage is unavailable. */
  }
  syncSiteTheme();
  document.dispatchEvent(new Event("genyxo:theme"));
}
export function setWorkspaceTheme(value: WorkspaceTheme) {
  try {
    if (value === "your") localStorage.removeItem(workspaceKey);
    else localStorage.setItem(workspaceKey, value);
  } catch {
    /* The current page can still render its saved appearance. */
  }
  syncSiteTheme();
  document.dispatchEvent(new Event("genyxo:workspace-theme"));
}
