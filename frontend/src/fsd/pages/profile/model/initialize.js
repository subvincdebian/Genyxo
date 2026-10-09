import { initializeProfileHead0 as initialize0 } from "@/features/profile";
import { initializeScript as initialize1 } from "@/features/platform";
import { initializeProfileSecurity as initialize2 } from "@/features/profile-security";
import { initializeProfileTransactions as initialize3 } from "@/features/profile-transactions";
import { initializeProfileInline0 as initialize4 } from "@/features/profile";
import { initializeProfileInline1 as initialize5 } from "@/features/profile";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  initialize1(scope, context);
  initialize2(scope, context);
  initialize3(scope, context);
  initialize4(scope, context);
  initialize5(scope, context);
  scope.register("profile-0", function (event) {
    scope.window.filterPrompts();
  });
  scope.register("profile-1", function (event) {
    scope.window.updateChart("days", event);
  });
  scope.register("profile-2", function (event) {
    scope.window.updateChart("weeks", event);
  });
  scope.register("profile-3", function (event) {
    scope.window.updateChart("months", event);
  });
  scope.register("profile-4", function (event) {
    scope.window.updateChart("years", event);
  });
  scope.register("profile-5", function (event) {
    context.requestPayout();
  });
  scope.register("profile-6", function (event) {
    scope.window.openFaqPage("page-general");
  });
  scope.register("profile-7", function (event) {
    scope.window.openFaqPage("page-subscription");
  });
  scope.register("profile-8", function (event) {
    scope.window.openFaqPage("page-models");
  });
  scope.register("profile-9", function (event) {
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
