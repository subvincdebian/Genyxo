import { initializeFaqInline0 as initialize0 } from "@/features/faq";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  scope.register("faq-0", function (event) {
    context.closeMenu();
  });
  scope.register("faq-1", function (event) {
    context.toggleMobileMenu();
  });
  scope.register("faq-2", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-3", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-4", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-5", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-6", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-7", function (event) {
    scope.window.openTab(event, "review");
  });
  scope.register("faq-8", function (event) {
    scope.window.openTab(event, "privacy");
  });
  scope.register("faq-9", function (event) {
    scope.window.openTab(event, "terms");
  });
  scope.register("faq-10", function (event) {
    scope.window.openTab(event, "faq");
  });
  scope.register("faq-11", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-12", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-13", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-14", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-15", function (event) {
    scope.window.closeSidebarOnMobile();
  });
  scope.register("faq-16", function (event) {
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
