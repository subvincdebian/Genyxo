// Behavior migrated from chat-head0; resources are owned by the React mount.

import {
  API_BASE_URL as API_ORIGIN,
  SOCKET_URL as SOCKET_ORIGIN,
} from "@/shared/config";
export default function initialize(scope, context) {
  (function () {
    const docEl = scope.document.documentElement;
    function updateViewportVars() {
      const vv = scope.window.visualViewport;
      const height = vv ? vv.height : scope.window.innerHeight;
      docEl.style.setProperty("--app-height", `${height}px`);
      if (vv) {
        const bottom = Math.max(
          0,
          scope.window.innerHeight - vv.height - vv.offsetTop,
        );
        docEl.style.setProperty("--vv-bottom", `${bottom}px`);
      } else {
        docEl.style.setProperty("--vv-bottom", "0px");
      }
    }
    updateViewportVars();
    if (scope.window.visualViewport) {
      scope.listen(scope.window.visualViewport, "resize", updateViewportVars);
      scope.listen(scope.window.visualViewport, "scroll", updateViewportVars);
    }
    scope.window.addEventListener("resize", updateViewportVars);
  })();
}
