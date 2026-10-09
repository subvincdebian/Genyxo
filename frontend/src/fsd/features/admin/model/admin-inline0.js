// Behavior migrated from admin-inline0; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
const tbody = scope.document.getElementById('usersTable');
const replyModal = scope.document.getElementById('replyModal');
let usersPage = 1;
const usersLimit = 10;
let txPage = 1;
const txLimit = 10;
let ticketsPage = 1;
const ticketsLimit = 10;
async function loadAdminProfile() {
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${context.token}`
      }
    });
    if (res.ok) {
      const user = await res.json();
      const navAvatar = scope.document.getElementById('navAvatar');
      const navUsername = scope.document.getElementById('navUsername');
      const menuName = scope.document.getElementById('menuName');
      const menuEmail = scope.document.getElementById('menuEmail');
      const dropdownAvatar = scope.document.querySelector('.dropdown-avatar');
      if (user.avatar) {
        navAvatar.src = user.avatar;
        dropdownAvatar.src = user.avatar;
      }
      if (user.name) {
        navUsername.textContent = user.name;
        menuName.textContent = user.name;
      }
      if (user.email) menuEmail.textContent = user.email;
    }
  } catch (e) {
    console.error("Profile load error", e);
  }
}
function setPaginationLoading(type, isLoading) {
  const prevBtn = scope.document.getElementById(`prev${type}Btn`);
  const nextBtn = scope.document.getElementById(`next${type}Btn`);
  if (isLoading) {
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
  }
}
function updatePaginationUI(type, meta) {
  const prevBtn = scope.document.getElementById(`prev${type}Btn`);
  const nextBtn = scope.document.getElementById(`next${type}Btn`);
  const infoSpan = scope.document.getElementById(`${type.toLowerCase()}PageInfo`);
  if (infoSpan) {
    infoSpan.textContent = `Page ${meta.page} of ${meta.lastPage} (Total: ${meta.total})`;
  }
  if (prevBtn) {
    prevBtn.disabled = meta.page <= 1;
    const newPrev = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    scope.listen(newPrev, 'click', () => {
      if (type === 'User') {
        usersPage--;
        loadUsers();
      }
      if (type === 'Tx') {
        txPage--;
        loadTransactions();
      }
      if (type === 'Ticket') {
        ticketsPage--;
        loadAdminTickets();
      }
    });
  }
  if (nextBtn) {
    nextBtn.disabled = meta.page >= meta.lastPage;
    const newNext = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);
    scope.listen(newNext, 'click', () => {
      if (type === 'User') {
        usersPage++;
        loadUsers();
      }
      if (type === 'Tx') {
        txPage++;
        loadTransactions();
      }
      if (type === 'Ticket') {
        ticketsPage++;
        loadAdminTickets();
      }
    });
  }
}
async function loadUsers() {
  setPaginationLoading('User', true);
  const refreshIcon = scope.document.getElementById('refreshIconUsers');
  if (refreshIcon) refreshIcon.classList.add('spin');
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/are-you-sure-you-want-to-admin/users?page=${usersPage}&limit=${usersLimit}`, {
      headers: {
        'Authorization': `Bearer ${context.token}`
      }
    });
    if (res.status === 403 || res.status === 401) {
      alert("Session expired or access denied.");
      localStorage.removeItem('authToken');
      scope.window.location.href = 'index.html';
      return;
    }
    const result = await res.json();
    const users = result.data ? result.data : result;
    const meta = result.meta || {
      page: 1,
      lastPage: 1,
      total: users.length
    };
    tbody.innerHTML = '';
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users found</td></tr>`;
    } else {
      users.forEach(u => {
        const roleBadge = u.role === 'admin' ? '<span class="badge badge-admin">ADMIN</span>' : 'User';
        const userName = u.name ? u.name : '-';
        const userCredits = u.credits ? u.credits : '0.00';
        tbody.innerHTML += `
                            <tr>
                                <td data-label="ID">#${u.id}</td>
                                <td data-label="Email" title="${u.email}">${u.email}</td>
                                <td data-label="Name">${userName}</td>
                                <td data-label="Role">${roleBadge}</td>
                                <td data-label="Credits"><strong>${userCredits}</strong></td>
                                <td data-label="Action" style="text-align:right;">
                                    <button class="action-btn" aria-label="Add Credits" onclick="addCreditsPrompt(${u.id})">+ Credits</button>
                                </td>
                            </tr>
                        `;
      });
    }
    updatePaginationUI('User', meta);
  } catch (e) {
    console.error(e);
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('spin');
  }
}
async function loadTransactions() {
  setPaginationLoading('Tx', true);
  const refreshIcon = scope.document.getElementById('refreshIconUsers');
  if (refreshIcon) refreshIcon.classList.add('spin');
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/are-you-sure-you-want-to-admin/transactions`, {
      headers: {
        'Authorization': `Bearer ${context.token}`
      }
    });
    if (res.status === 403 || res.status === 401) {
      alert("Session expired or access denied.");
      localStorage.removeItem('authToken');
      scope.window.location.href = 'index.html';
      return;
    }
    const result = await res.json();
    const transactions = result.data;
    const meta = result.meta || {
      page: 1,
      lastPage: 1,
      total: transactions.length
    };
    const purchaseBody = scope.document.getElementById('transactionsTable');
    const usageBody = scope.document.getElementById('usageTableBody');
    purchaseBody.innerHTML = '';
    usageBody.innerHTML = '';
    transactions.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleString();
      const userEmail = tx.user?.email || 'N/A';
      if (tx.type === 'PURCHASE' || !tx.type) {
        let statusClass = 'status-pending';
        if (tx.status === 'APPROVED') statusClass = 'status-approved';
        if (tx.status === 'DECLINED') statusClass = 'status-declined';
        purchaseBody.innerHTML += `
                            <tr>
                                <td>${tx.id}</td>
                                <td style="word-break: break-all;">${userEmail}</td>
                                <td>$${tx.amount}</td>
                                <td style="color: #1dd1a1">+${tx.creditsAmount}</td>
                                <td>${tx.provider}</td>
                                <td><span class="${statusClass}">${tx.status}</span></td>
                                <td>${date}</td>
                            </tr>
                        `;
      } else {
        const isRefund = tx.type === 'REFUND';
        const statusClass = isRefund ? 'status-refund' : 'status-spent';
        const modelInfo = tx.model ? `<code style="color: ##1dd1a1;">${tx.model}</code>` : tx.description || 'AI Request';
        usageBody.innerHTML += `
                            <tr>
                                <td>${tx.id}</td>
                                <td style="word-break: break-all;">${userEmail}</td>
                                <td>${modelInfo}</td>
                                <td style="font-weight: bold; color: ${tx.creditsAmount > 0 ? '#1dd1a1' : '#ee5253'}">${tx.creditsAmount > 0 ? '+' : ''}${tx.creditsAmount}</td>
                                <td><span class="${statusClass}">${tx.type}</span></td>
                                <td>${date}</td>
                            </tr>
                        `;
      }
    });
    updatePaginationUI('Tx', meta);
  } catch (e) {
    console.error("Error loading transactions:", e);
  }
}
function filterUsers() {
  const input = scope.document.getElementById('userSearchInput');
  if (!input || !tbody) return;
  const term = input.value.toLowerCase();
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
}
async function loadAdminTickets() {
  setPaginationLoading('Ticket', true);
  const refreshIcon = scope.document.getElementById('refreshIconTickets');
  if (refreshIcon) refreshIcon.classList.add('spin');
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/are-you-sure-you-want-to-admin/tickets?page=${ticketsPage}&limit=${ticketsLimit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.token}`
      }
    });
    if (res.ok) {
      const result = await res.json();
      const tickets = result.data || [];
      const meta = result.meta || {
        page: 1,
        lastPage: 1,
        total: tickets.length
      };
      const tableBody = scope.document.getElementById('ticketsTableBody');
      tableBody.innerHTML = '';
      if (tickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No tickets found</td></tr>`;
      } else {
        const html = tickets.map(t => {
          const statusClass = `status-badge status-${t.status.toLowerCase().replace(' ', '_')}`;
          const priorityClass = `status-badge priority-${t.priority ? t.priority.toLowerCase() : 'medium'}`;
          const creationDate = new Date(t.createdAt).toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          return `
                                <tr data-ticket-id="${t.id}">
                                    <td data-label="Ticket ID">Ticket #${t.id}</td>
                                    <td data-label="User">${t.user ? t.user.name || t.user.email : 'Unknown'}</td>
                                    <td data-label="Subject" style="font-weight:600; color:white;">${t.subject}</td>
                                    <td data-label="Priority"><span class="${priorityClass}">${t.priority || 'MEDIUM'}</span></td>
                                    <td data-label="Status"><span class="${statusClass}">${t.status}</span></td>
                                    <td data-label="Created">${creationDate}</td>
                                    <td data-label="Action" style="text-align:right;">
                                        ${t.status !== 'CLOSED' ? `
                                            <button class="action-btn primary-btn" aria-label="Reply On Ticket" style="width:100%" onclick="openReplyModal(${t.id}, '${t.subject.replace(/'/g, "\\'")}')">Reply</button>
                                        ` : `<span style="color: #2ecc71;">Resolved</span>`}
                                    </td>
                                </tr>
                            `;
        }).join('');
        tableBody.innerHTML = html;
      }
      updatePaginationUI('Ticket', meta);
    }
  } catch (e) {
    console.error(e);
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('spin');
  }
}
async function processTx(id, action) {
  const endpoint = action === 'approve' ? 'approve-transaction' : 'decline-transaction';
  if (!confirm(`Are you sure you want to ${action.toUpperCase()}?`)) return;
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/are-you-sure-you-want-to-admin/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.token}`
      },
      body: JSON.stringify({
        txId: id
      })
    });
    if (res.ok) {
      loadTransactions();
      loadUsers();
    } else {
      context.showToast("Failed!", "error");
    }
  } catch (e) {
    context.showToast("Server Error...", "error");
  }
}
async function addCreditsPrompt(userId) {
  const amount = prompt("How many credits to add?");
  if (amount) {
    await scope.fetch(`${context.API_BASE_URL}/are-you-sure-you-want-to-admin/add-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.token}`
      },
      body: JSON.stringify({
        userId: Number(userId),
        amount: Number(amount)
      })
    });
    loadUsers();
  }
}
let currentTicketId = null;
function openReplyModal(id, userMessage) {
  currentTicketId = id;
  scope.document.getElementById('modalTicketId').textContent = id;
  scope.document.getElementById('modalUserMessage').textContent = userMessage;
  scope.document.getElementById('replyInput').value = '';
  replyModal.style.display = 'flex';
}
function closeReplyModal() {
  replyModal.style.display = 'none';
}
async function submitReply() {
  const replyText = scope.document.getElementById('replyInput').value;
  if (!replyText.trim()) {
    alert("Enter a reply");
    return;
  }
  try {
    const res = await scope.fetch(`${context.API_BASE_URL}/support/admin/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.token}`
      },
      body: JSON.stringify({
        ticketId: currentTicketId,
        response: replyText
      })
    });
    if (res.ok) {
      closeReplyModal();
      loadAdminTickets();
    } else {
      context.showToast("Failed", "error");
    }
  } catch (e) {
    context.showToast("Server Error", "error");
  }
}
scope.window.onclick = function (event) {
  if (event.target == replyModal) {
    closeReplyModal();
  }
};
scope.window.addEventListener('DOMContentLoaded', () => {
  context.initAdmin();
});
Object.defineProperty(context, "tbody", { configurable: true, get: () => tbody });
Object.defineProperty(context, "replyModal", { configurable: true, get: () => replyModal });
Object.defineProperty(context, "usersPage", { configurable: true, get: () => usersPage, set: value => { usersPage = value; } });
Object.defineProperty(context, "usersLimit", { configurable: true, get: () => usersLimit });
Object.defineProperty(context, "txPage", { configurable: true, get: () => txPage, set: value => { txPage = value; } });
Object.defineProperty(context, "txLimit", { configurable: true, get: () => txLimit });
Object.defineProperty(context, "ticketsPage", { configurable: true, get: () => ticketsPage, set: value => { ticketsPage = value; } });
Object.defineProperty(context, "ticketsLimit", { configurable: true, get: () => ticketsLimit });
Object.defineProperty(context, "loadAdminProfile", { configurable: true, get: () => loadAdminProfile });
Object.defineProperty(context, "setPaginationLoading", { configurable: true, get: () => setPaginationLoading });
Object.defineProperty(context, "updatePaginationUI", { configurable: true, get: () => updatePaginationUI });
Object.defineProperty(context, "loadUsers", { configurable: true, get: () => loadUsers });
Object.defineProperty(context, "loadTransactions", { configurable: true, get: () => loadTransactions });
Object.defineProperty(context, "filterUsers", { configurable: true, get: () => filterUsers });
Object.defineProperty(context, "loadAdminTickets", { configurable: true, get: () => loadAdminTickets });
Object.defineProperty(context, "processTx", { configurable: true, get: () => processTx });
Object.defineProperty(context, "addCreditsPrompt", { configurable: true, get: () => addCreditsPrompt });
Object.defineProperty(context, "currentTicketId", { configurable: true, get: () => currentTicketId, set: value => { currentTicketId = value; } });
Object.defineProperty(context, "openReplyModal", { configurable: true, get: () => openReplyModal });
Object.defineProperty(context, "closeReplyModal", { configurable: true, get: () => closeReplyModal });
Object.defineProperty(context, "submitReply", { configurable: true, get: () => submitReply });
scope.expose("loadAdminProfile", loadAdminProfile);
scope.expose("setPaginationLoading", setPaginationLoading);
scope.expose("updatePaginationUI", updatePaginationUI);
scope.expose("loadUsers", loadUsers);
scope.expose("loadTransactions", loadTransactions);
scope.expose("filterUsers", filterUsers);
scope.expose("loadAdminTickets", loadAdminTickets);
scope.expose("processTx", processTx);
scope.expose("addCreditsPrompt", addCreditsPrompt);
scope.expose("openReplyModal", openReplyModal);
scope.expose("closeReplyModal", closeReplyModal);
scope.expose("submitReply", submitReply);

}
