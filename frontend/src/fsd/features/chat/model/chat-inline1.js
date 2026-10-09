// Behavior migrated from chat-inline1; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
function setTheme(theme) {
  const root = scope.document.documentElement;
  const isSystemDark = scope.window.matchMedia('(prefers-color-scheme: dark)').matches;
  scope.document.querySelectorAll('.submenu-item').forEach(el => el.classList.remove('active'));
  if (theme === 'system') {
    localStorage.removeItem('theme');
    if (isSystemDark) {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', 'light');
    }
    scope.document.getElementById('theme-system').classList.add('active');
  } else if (theme === 'dark') {
    localStorage.setItem('theme', 'dark');
    root.removeAttribute('data-theme');
    scope.document.getElementById('theme-dark').classList.add('active');
  } else if (theme === 'light') {
    localStorage.setItem('theme', 'light');
    root.setAttribute('data-theme', 'light');
    scope.document.getElementById('theme-light').classList.add('active');
  }
}
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme('system');
  }
}
scope.listen(scope.window.matchMedia('(prefers-color-scheme: dark)'), 'change', e => {
  if (!localStorage.getItem('theme')) {
    setTheme('system');
  }
});
initTheme();
Object.defineProperty(context, "setTheme", { configurable: true, get: () => setTheme });
Object.defineProperty(context, "initTheme", { configurable: true, get: () => initTheme });
scope.expose("setTheme", setTheme);
scope.expose("initTheme", initTheme);

}
