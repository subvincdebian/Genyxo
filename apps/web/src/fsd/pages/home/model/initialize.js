import { initializeHomeHead0 as initialize0 } from "@/features/home";
import { initializeDemochat as initialize1 } from "@/features/demo-chat";
import { initializeScript as initialize2 } from "@/features/platform";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  initialize1(scope, context);
  initialize2(scope, context);
  scope.register("home-0", function (event) {
    context.openCategoryModal("packs");
  });
  scope.register("home-1", function (event) {
    context.openCategoryModal("models");
  });
  scope.register("home-2", function (event) {
    context.openCategoryModal("actions");
  });
  scope.register("home-3", function (event) {
    scope.window.location.hash = "#products";
  });
  scope.register("home-4", function (event) {
    context.processPayment();
  });
  scope.register("home-5", function (event) {
    scope.window.openFaqPage("page-general");
  });
  scope.register("home-6", function (event) {
    scope.window.openFaqPage("page-subscription");
  });
  scope.register("home-7", function (event) {
    scope.window.openFaqPage("page-models");
  });
  scope.register("home-8", function (event) {
    scope.window.openFaqPage("page-errors");
  });
  scope.register("home-9", function (event) {
    scope.document.getElementById("aiModelModal").style.display = "none";
  });
  scope.register("home-10", function (event) {
    scope.document.getElementById("categoryModal").style.display = "none";
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
}
