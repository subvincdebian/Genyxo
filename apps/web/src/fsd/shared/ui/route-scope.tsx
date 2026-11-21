import type { ReactNode } from "react";

export type RouteScopeName =
  | "home"
  | "profile"
  | "notifications"
  | "admin"
  | "policies"
  | "dashboard"
  | "sign-in"
  | "share";

// Marks the DOM of a route whose global stylesheets are gated to it by
// scripts/postcss-route-scope.cjs. `display: contents` keeps the wrapper out
// of layout, so body-level rules still see the page's own elements.
export function RouteScope({
  name,
  children,
}: {
  name: RouteScopeName;
  children: ReactNode;
}) {
  return (
    <div className={`gx-route-${name}`} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
