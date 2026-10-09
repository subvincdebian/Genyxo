// Behavior migrated from admin-head0; resources are owned by the React mount.

import {
  API_BASE_URL as API_ORIGIN,
  SOCKET_URL as SOCKET_ORIGIN,
} from "@/shared/config";
export default function initialize(scope, context) {
  async function initAdmin() {
    await Promise.all([
      context.loadAdminProfile(),
      context.loadUsers(),
      context.loadTransactions(),
      context.loadAdminTickets(),
    ]);
    scope.document.getElementById("admin-loader")?.remove();
  }
  Object.defineProperty(context, "initAdmin", {
    configurable: true,
    get: () => initAdmin,
  });
  scope.expose("initAdmin", initAdmin);
}
