import initialize0 from '@/features/chat/model/chat-head0.js';
import initialize1 from '@/features/chat/model/chat-head1.js';
import initialize2 from '@/features/platform/model/script.js';
import initialize3 from '@/features/conversation/model/chat.js';
import initialize4 from '@/features/chat/model/chat-inline0.js';
import initialize5 from '@/features/chat/model/chat-inline1.js';
import initialize6 from '@/features/chat/model/chat-inline2.js';
import initialize7 from '@/features/chat/model/chat-inline3.js';
import initialize8 from '@/features/chat/model/chat-inline4.js';
export default function initialize(scope){const context=scope.context;
initialize0(scope,context);
initialize1(scope,context);
initialize2(scope,context);
initialize3(scope,context);
initialize4(scope,context);
initialize5(scope,context);
initialize6(scope,context);
initialize7(scope,context);
initialize8(scope,context);
scope.register("chat-0", function(event) {
  context.toggleSidebar();
});
scope.register("chat-1", function(event) {
  context.startNewChat(event);
});
scope.register("chat-2", function(event) {
  return false;
});
scope.register("chat-3", function(event) {
  context.setTheme('system');
});
scope.register("chat-4", function(event) {
  context.setTheme('dark');
});
scope.register("chat-5", function(event) {
  context.setTheme('light');
});
scope.register("chat-6", function(event) {
  scope.window.open('policies/privacy-policy.html', '_blank');
});
scope.register("chat-7", function(event) {
  scope.window.open('policies/terms-of-service.html', '_blank');
});
scope.register("chat-8", function(event) {
  context.toggleSidebar();
});
scope.register("chat-9", function(event) {
  return false;
});
scope.register("chat-10", function(event) {
  context.setTheme('system');
});
scope.register("chat-11", function(event) {
  context.setTheme('dark');
});
scope.register("chat-12", function(event) {
  context.setTheme('light');
});
scope.register("chat-13", function(event) {
  scope.window.open('policies/privacy-policy.html', '_blank');
});
scope.register("chat-14", function(event) {
  scope.window.open('policies/terms-of-service.html', '_blank');
});
scope.register("chat-15", function(event) {
  scope.window.location.href = 'index.html#products';
});
scope.register("chat-16", function(event) {
  context.setInput('Generate a futuristic image');
});
scope.register("chat-17", function(event) {
  context.setInput('Write a Python script');
});
scope.register("chat-18", function(event) {
  context.setInput('Create a short video');
});
scope.register("chat-19", function(event) {
  scope.window.openFaqPage('page-general');
});
scope.register("chat-20", function(event) {
  scope.window.openFaqPage('page-subscription');
});
scope.register("chat-21", function(event) {
  scope.window.openFaqPage('page-models');
});
scope.register("chat-22", function(event) {
  scope.window.openFaqPage('page-errors');
});
if (context.loadProducts) { scope.listen(document, 'genyxo:language', () => context.loadProducts()); scope.onReady(() => context.loadProducts()); }
scope.expose('openLangModal', () => { const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; });
scope.listen(document, 'click', event => { const button=event.target.closest?.('[data-i18n="menu.language"]')?.parentElement; if(button && button.contains(event.target)) { event.preventDefault(); const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; } if(event.target.closest?.('#closeLangModal')) { const modal=document.getElementById('langModal'); if(modal) modal.style.display='none'; } });

}