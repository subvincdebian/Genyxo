import { initializePolicies as initialize0 } from "@/features/policy-navigation";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  scope.register("policies-0", function (event) {
    context.closeMenu();
  });
  scope.register("policies-1", function (event) {
    context.toggleMobileMenu();
  });
  scope.register("policies-2", function (event) {
    scope.window.openTab(event, "review");
  });
  scope.register("policies-3", function (event) {
    scope.window.openTab(event, "privacy");
  });
  scope.register("policies-4", function (event) {
    scope.window.openTab(event, "terms");
  });
  scope.register("policies-5", function (event) {
    scope.window.openTab(event, "faq");
  });
  scope.register("policies-6", function (event) {
    scope.window.openTab(event, "privacy");
  });
  scope.register("policies-7", function (event) {
    scope.window.openTab(event, "terms");
  });
  scope.listen(document, "genyxo:notifications-read", () =>
    context.updateNotificationsBadge?.(),
  );
  scope.listen(document, "genyxo:toast", (event) =>
    context.showToast?.(event.detail.message, event.detail.type),
  );
  if (context.loadProducts) {
    scope.listen(document, "genyxo:language", () => context.loadProducts());
    scope.onReady(() => context.loadProducts());
  }
  scope.expose("openLangModal", () => {
    const modal = document.getElementById("langModal");
    if (modal) modal.style.display = "flex";
  });
  scope.listen(document, "click", (event) => {
    const button = event.target.closest?.(
      '[data-i18n="menu.language"]',
    )?.parentElement;
    if (button && button.contains(event.target)) {
      event.preventDefault();
      const modal = document.getElementById("langModal");
      if (modal) modal.style.display = "flex";
    }
    if (event.target.closest?.("#closeLangModal")) {
      const modal = document.getElementById("langModal");
      if (modal) modal.style.display = "none";
    }
  });
  scope.expose("closeSidebarOnMobile", () => {
    if (window.innerWidth <= 992) context.closeMenu();
  });
  scope.expose(
    "toggleSidebar",
    (context.toggleSidebar = () => {
      document.getElementById("sidebar")?.classList.toggle("active");
      document.getElementById("sidebar-overlay")?.classList.toggle("active");
    }),
  );
  scope.expose("openTab", () => {});
}
