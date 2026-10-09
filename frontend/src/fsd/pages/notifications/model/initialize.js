import initialize0 from '@/features/notifications/model/notifications-head0.js';
import initialize1 from '@/features/platform/model/script.js';
import initialize2 from '@/features/notifications/model/notifications-inline0.js';
import initialize3 from '@/features/notifications/model/notifications-inline1.js';
export default function initialize(scope){const context=scope.context;
initialize0(scope,context);
initialize1(scope,context);
initialize2(scope,context);
initialize3(scope,context);
scope.register("notifications-0", function(event) {
  context.markAllRead();
});
scope.register("notifications-1", function(event) {
  scope.window.openFaqPage('page-general');
});
scope.register("notifications-2", function(event) {
  scope.window.openFaqPage('page-subscription');
});
scope.register("notifications-3", function(event) {
  scope.window.openFaqPage('page-models');
});
scope.register("notifications-4", function(event) {
  scope.window.openFaqPage('page-errors');
});
if (context.loadProducts) { scope.listen(document, 'genyxo:language', () => context.loadProducts()); scope.onReady(() => context.loadProducts()); }
scope.expose('openLangModal', () => { const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; });
scope.listen(document, 'click', event => { const button=event.target.closest?.('[data-i18n="menu.language"]')?.parentElement; if(button && button.contains(event.target)) { event.preventDefault(); const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; } if(event.target.closest?.('#closeLangModal')) { const modal=document.getElementById('langModal'); if(modal) modal.style.display='none'; } });

}