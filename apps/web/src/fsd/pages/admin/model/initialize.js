import { initializeAdminHead0 as initialize0 } from "@/features/admin";
import { initializeScript as initialize1 } from "@/features/platform";
import { initializeAdminInline0 as initialize2 } from "@/features/admin";
export default function initialize(scope) {
  const context = scope.context;
  initialize0(scope, context);
  initialize1(scope, context);
  initialize2(scope, context);
  scope.register("admin-0", function (event) {
    scope.window.openLangModal();
    return false;
  });
  scope.register("admin-1", function (event) {
    context.loadUsers();
  });
  scope.register("admin-2", function (event) {
    context.filterUsers();
  });
  scope.register("admin-3", function (event) {
    context.loadTransactions();
  });
  scope.register("admin-4", function (event) {
    context.loadTransactions();
  });
  scope.register("admin-5", function (event) {
    context.loadAdminTickets();
  });
  scope.register("admin-6", function (event) {
    context.closeReplyModal();
  });
  scope.register("admin-7", function (event) {
    context.submitReply();
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
