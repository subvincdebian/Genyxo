// Behavior migrated from home-head0; resources are owned by the React mount.

export default function initialize(scope, context) {
  (function () {
    const token = localStorage.getItem("authToken");
    if (token) {
      scope.document.documentElement.classList.add("auth-active");
    }
  })();
}
