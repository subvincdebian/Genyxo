// Legacy controller entry points delegate to the shared theme owner.
import { setWorkspaceTheme, syncSiteTheme } from "@/shared/lib/theme";
export default function initialize(scope, context) {
  const setTheme = (value) =>
    setWorkspaceTheme(value === "dark" || value === "light" ? value : "your");
  const initTheme = () => syncSiteTheme();
  initTheme();
  Object.defineProperty(context, "setTheme", {
    configurable: true,
    get: () => setTheme,
  });
  Object.defineProperty(context, "initTheme", {
    configurable: true,
    get: () => initTheme,
  });
  scope.expose("setTheme", setTheme);
  scope.expose("initTheme", initTheme);
}
