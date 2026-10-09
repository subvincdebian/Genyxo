import initialize0 from '@/features/privacy-policy/model/privacy-policy-inline0.js';
export default function initialize(scope){const context=scope.context;
initialize0(scope,context);
scope.register("privacy-policy-0", function(event) {
  context.toggleSidebar();
});
scope.register("privacy-policy-1", function(event) {
  context.toggleMobileMenu();
});
scope.register("privacy-policy-2", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-3", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-4", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-5", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-6", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-7", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-8", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-9", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-10", function(event) {
  scope.window.closeSidebarOnMobile();
});
scope.register("privacy-policy-11", function(event) {
  scope.window.openTab(event, 'review');
});
scope.register("privacy-policy-12", function(event) {
  scope.window.openTab(event, 'privacy');
});
scope.register("privacy-policy-13", function(event) {
  scope.window.openTab(event, 'terms');
});
scope.register("privacy-policy-14", function(event) {
  scope.window.openTab(event, 'faq');
});
if (context.loadProducts) { scope.listen(document, 'genyxo:language', () => context.loadProducts()); scope.onReady(() => context.loadProducts()); }
scope.expose('openLangModal', () => { const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; });
scope.listen(document, 'click', event => { const button=event.target.closest?.('[data-i18n="menu.language"]')?.parentElement; if(button && button.contains(event.target)) { event.preventDefault(); const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; } if(event.target.closest?.('#closeLangModal')) { const modal=document.getElementById('langModal'); if(modal) modal.style.display='none'; } });
scope.expose('closeSidebarOnMobile', () => { if(window.innerWidth <= 992) context.closeMenu(); }); scope.expose('toggleSidebar', () => { document.getElementById('sidebar')?.classList.toggle('active'); document.getElementById('sidebar-overlay')?.classList.toggle('active'); }); scope.expose('openTab', () => {});
}