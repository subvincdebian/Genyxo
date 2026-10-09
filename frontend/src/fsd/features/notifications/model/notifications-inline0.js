// Behavior migrated from notifications-inline0; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
function safeTranslate(path, defaultText) {
  if (!scope.window.i18n || !scope.window.i18n.translations) return defaultText;
  const keys = path.split('.');
  let res = scope.window.i18n.translations;
  for (let k of keys) {
    if (res) res = res[k];else return defaultText;
  }
  return res || defaultText;
}
function prependNotification(n) {
  const container = scope.document.getElementById('notifList');
  if (!container) return;
  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();
  let icon = 'fa-bell';
  if (n.type === 'SYSTEM' || n.title.includes('Payment')) icon = 'fa-wallet';
  if (n.type === 'SUPPORT') icon = 'fa-headset';
  const html = `
                <div class="notif-card unread" onclick="markRead(${n.id}, this)">
                    <div class="notif-icon"><i class="fas ${icon}"></i></div>
                    <div class="notif-content">
                        <h3>${n.title}</h3>
                        <p>${n.message}</p>
                        <span class="notif-time">${safeTranslate('notifications.just_now', 'Just now')}</span>
                    </div>
                </div>`;
  container.insertAdjacentHTML('afterbegin', html);
}
async function loadNotifications() {
  let API_BASE_URL = API_ORIGIN;
  if (!context.token) return;
  try {
    const res = await scope.fetch(`${API_BASE_URL}/notifications`, {
      headers: {
        'Authorization': `Bearer ${context.token}`
      }
    });
    const list = await res.json();
    const container = scope.document.getElementById('notifList');
    if (list.length === 0) {
      const emptyText = safeTranslate('notifications.empty_state', 'No notifications yet.');
      container.innerHTML = `<div class="empty-state"><i class="far fa-bell-slash"></i><p>${emptyText}</p></div>`;
      return;
    }
    const timeLocale = safeTranslate('notifications.time_format', 'en-US');
    container.innerHTML = list.map(n => {
      let icon = 'fa-bell';
      if (n.type === 'SYSTEM' || n.title.includes('Payment')) icon = 'fa-wallet';
      if (n.type === 'SUPPORT') icon = 'fa-headset';
      return `
                    <div class="notif-card ${n.isRead ? '' : 'unread'}" onclick="markRead(${n.id}, this)">
                        <div class="notif-icon"><i class="fas ${icon}"></i></div>
                        <div class="notif-content">
                            <h3>${n.title}</h3>
                            <p>${n.message}</p>
                            <span class="notif-time">${new Date(n.createdAt).toLocaleString(timeLocale)}</span>
                        </div>
                    </div>`;
    }).join('');
  } catch (e) {
    console.error(e);
    const errorText = safeTranslate('notifications.error_loading', 'Error loading data');
    scope.document.getElementById('notifList').innerHTML = `<p style="color:red; text-align:center">${errorText}</p>`;
  }
}
async function markRead(id, element) {
  let API_BASE_URL = API_ORIGIN;
  element.classList.remove('unread');
  await scope.fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${context.token}`
    }
  });
  if (typeof context.updateNotificationsBadge === 'function') {
    context.updateNotificationsBadge();
  }
}
async function markAllRead() {
  let API_BASE_URL = API_ORIGIN;
  const confirmText = safeTranslate('notifications.confirm_read_all', 'Mark all as read?');
  if (!confirm(confirmText)) return;
  try {
    await scope.fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.token}`
      }
    });
    loadNotifications();
    context.showToast('All marked as read', 'success');
    if (typeof context.updateNotificationsBadge === 'function') {
      context.updateNotificationsBadge();
    }
  } catch (e) {
    context.showToast('Failed to mark notifications.', 'error');
  }
}
scope.document.addEventListener('DOMContentLoaded', () => {
  if (!context.token) {
    scope.window.location.href = 'index.html';
  } else {
    loadNotifications();
  }
  const langMenuBtn = scope.document.getElementById('langMenuBtn');
  if (langMenuBtn) {
    scope.listen(langMenuBtn, 'click', e => {
      e.preventDefault();
      const modal = scope.document.getElementById('langModal');
      if (modal) modal.style.display = 'flex';
    });
  }
  const closeLangBtn = scope.document.getElementById('closeLangModal');
  if (closeLangBtn) {
    scope.listen(closeLangBtn, 'click', () => {
      scope.document.getElementById('langModal').style.display = 'none';
    });
  }
});
Object.defineProperty(context, "safeTranslate", { configurable: true, get: () => safeTranslate });
Object.defineProperty(context, "prependNotification", { configurable: true, get: () => prependNotification });
Object.defineProperty(context, "loadNotifications", { configurable: true, get: () => loadNotifications });
Object.defineProperty(context, "markRead", { configurable: true, get: () => markRead });
Object.defineProperty(context, "markAllRead", { configurable: true, get: () => markAllRead });
scope.expose("safeTranslate", safeTranslate);
scope.expose("prependNotification", prependNotification);
scope.expose("loadNotifications", loadNotifications);
scope.expose("markRead", markRead);
scope.expose("markAllRead", markAllRead);

}
