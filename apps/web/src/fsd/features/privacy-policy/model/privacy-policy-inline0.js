// Behavior migrated from privacy-policy-inline0; resources are owned by the React mount.

import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
scope.window.onload = function () {
  scope.setTimeout(function () {
    scope.window.scrollTo(0, 0);
  }, 10);
};
function toggleMobileMenu() {
  const sidebar = scope.document.getElementById('mobileSidebar');
  const overlay = scope.document.getElementById('sidebar-overlay');
  sidebar.classList.add('active');
  overlay.classList.add('active');
  scope.document.body.style.overflow = 'hidden';
}
function closeMenu() {
  const sidebar = scope.document.getElementById('mobileSidebar');
  const overlay = scope.document.getElementById('sidebar-overlay');
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
  scope.document.body.style.overflow = '';
}
scope.listen(scope.document.getElementById('sidebar-overlay'), 'click', closeMenu);
scope.document.addEventListener('click', function (event) {
  const sidebar = scope.document.getElementById('mobileSidebar');
  const overlay = scope.document.getElementById('sidebar-overlay');
  const burger = scope.document.getElementById('toggleMobileMenu');
  if (sidebar.classList.contains('active') && overlay.classList.contains('active')) {
    if (!sidebar.contains(event.target) && !burger.contains(event.target)) {
      closeMenu();
    }
  }
});
Object.defineProperty(context, "toggleMobileMenu", { configurable: true, get: () => toggleMobileMenu });
Object.defineProperty(context, "closeMenu", { configurable: true, get: () => closeMenu });
scope.expose("toggleMobileMenu", toggleMobileMenu);
scope.expose("closeMenu", closeMenu);


}
