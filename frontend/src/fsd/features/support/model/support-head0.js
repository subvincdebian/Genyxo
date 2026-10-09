// Behavior migrated from support-head0; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
(function () {
  const token = localStorage.getItem('authToken');
  if (token) {
    scope.document.documentElement.classList.add('auth-active');
  }
})();



}
