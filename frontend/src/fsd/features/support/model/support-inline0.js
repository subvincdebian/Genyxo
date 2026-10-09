// Behavior migrated from support-inline0; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
function getTrans(key, fallback) {
  if (scope.window.i18n && scope.window.i18n.translations) {
    const keys = key.split('.');
    let text = scope.window.i18n.translations;
    for (const k of keys) {
      text = text ? text[k] : null;
    }
    return text || fallback;
  }
  return fallback;
}
async function loadTickets() {
  if (!context.token) return;
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/support/my-tickets`, {
      headers: {
        'Authorization': `Bearer ${context.token}`
      }
    });
    const tickets = await res.json();
    const container = scope.document.getElementById('ticketList');
    const noTicketsText = getTrans('support.no_tickets', 'No tickets found.');
    const createdAtText = getTrans('support.created_at', 'Opened:');
    const replyText = getTrans('support.admin_reply', 'Support Team Replied:');
    const awaitingText = getTrans('support.awaiting', 'Awaiting response from admin...');
    if (tickets.length === 0) {
      container.innerHTML = `<p style="color: gray; text-align: center;">${noTicketsText}</p>`;
      return;
    }
    container.innerHTML = tickets.map(t => {
      const statusClass = `status-badge status-${t.status ? t.status.toLowerCase() : 'open'}`;
      const priorityVal = t.priority ? t.priority.toLowerCase() : 'low';
      const priorityClass = `status-badge priority-${priorityVal}`;
      const openedDate = new Date(t.createdAt).toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const cardClass = t.status === 'CLOSED' ? 'ticket-card resolved' : 'ticket-card';
      return `
                        <div class="${cardClass}">
                            <div class="ticket-header">
                                <h3>Ticket #${t.id}: ${t.subject}</h3>
                                <div>
                                    <span class="${priorityClass}" style="margin-right: 5px;">${t.priority || 'Low'}</span> 
                                    <span class="${statusClass}">${t.status}</span>
                                </div>
                            </div>
                            
                            <div class="ticket-card">
                                <p style="margin: 5px 0;"><strong>${createdAtText}</strong> ${openedDate}</p>
                                <p style="color: #ccc;">${t.message}</p>
                            </div>
                            
                            ${t.adminResponse ? `
                                <div class="admin-response admin-reply">
                                    <span class="reply-label"><i class="fas fa-user-shield"></i> ${replyText}</span>
                                    <div style="margin-top: 5px;">${t.adminResponse}</div>
                                </div>
                            ` : `
                                <p style="opacity: 0.6; margin-top: 15px; font-style: italic; font-size: 0.9em;">
                                    ${awaitingText}
                                </p>
                            `}
                        </div>
                    `;
    }).join('');
  } catch (e) {
    console.error(e);
    const container = scope.document.getElementById('ticketList');
    if (container) container.innerHTML = `<p style="color: red;">Error loading tickets.</p>`;
  }
}
scope.listen(scope.document.getElementById('createTicketForm'), 'submit', async e => {
  e.preventDefault();
  const subject = scope.document.getElementById('ticketSubject').value;
  const message = scope.document.getElementById('ticketMessage').value;
  const priority = scope.document.getElementById('ticketPriority').value;
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/support/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.token}`
      },
      body: JSON.stringify({
        subject,
        message,
        priority
      })
    });
    if (res.ok) {
      if (typeof context.showToast === 'function') {
        context.showToast('Ticket created successfully!', 'success');
      } else {
        alert('Ticket created!');
      }
      scope.document.getElementById('createTicketForm').reset();
      loadTickets();
    } else {
      context.showToast('Error creating ticket.', 'error');
    }
  } catch (e) {
    context.showToast('Server error. Please try again later.', 'error');
  }
});
scope.document.addEventListener('DOMContentLoaded', () => {
  if (!context.token) {
    scope.window.location.href = 'index.html';
  } else {
    loadTickets();
    context.updateNotificationsBadge();
  }
});
Object.defineProperty(context, "getTrans", { configurable: true, get: () => getTrans });
Object.defineProperty(context, "loadTickets", { configurable: true, get: () => loadTickets });
scope.expose("getTrans", getTrans);
scope.expose("loadTickets", loadTickets);

}
