import { initializeTermsOfServiceInline0 as initialize0 } from "@/features/terms-of-service";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  scope.register("terms-of-service-0", function (event) {
    context.closeMenu();
  });
  scope.register("terms-of-service-1", function (event) {
    context.toggleMobileMenu();
  });
  scope.register("terms-of-service-2", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-3", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-4", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-5", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-6", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-7", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-8", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-9", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-10", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-11", function (event) {
    scope.window.openTab(event, "review");
  });
  scope.register("terms-of-service-12", function (event) {
    scope.window.openTab(event, "privacy");
  });
  scope.register("terms-of-service-13", function (event) {
    scope.window.openTab(event, "terms");
  });
  scope.register("terms-of-service-14", function (event) {
    scope.window.openTab(event, "faq");
  });
  scope.register("terms-of-service-15", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-16", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-17", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-18", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-19", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-20", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-21", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-22", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("terms-of-service-23", function (event) {
    scope.window.closeSidebarOnMobile();
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
