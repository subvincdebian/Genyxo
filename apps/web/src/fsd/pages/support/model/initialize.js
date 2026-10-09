import { initializeSupportHead0 as initialize0 } from "@/features/support";
import { initializeScript as initialize1 } from "@/features/platform";
import { initializeSupportInline1 as initialize2 } from "@/features/support";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  initialize1(scope, context);
  initialize2(scope, context);
  scope.register("support-0", function (event) {
    scope.window.openFaqPage("page-general");
  });
  scope.register("support-1", function (event) {
    scope.window.openFaqPage("page-subscription");
  });
  scope.register("support-2", function (event) {
    scope.window.openFaqPage("page-models");
  });
  scope.register("support-3", function (event) {
    scope.window.openFaqPage("page-errors");
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
