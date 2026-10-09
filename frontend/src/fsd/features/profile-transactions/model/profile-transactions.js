// Behavior migrated from profile-transactions.js; resources are owned by the React mount.
import { Chart } from '@/shared/lib/browser-integrations';
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
// 1. Данные ГЛОБАЛЬНО
const chartData = {
  days: {
    labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    data: [120, 450, 300, 700, 400, 550, 480]
  },
  weeks: {
    labels: ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4'],
    data: [2000, 3500, 1800, 4200]
  },
  months: {
    labels: ['Янв', 'Фев', 'Мар', 'Апр'],
    data: [12000, 15000, 9000, 11000]
  },
  years: {
    labels: ['2024', '2025'],
    data: [45000, 89000]
  }
};

// Функция для создания градиента
function getGradient(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(0, 251, 165, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 251, 165, 0)');
  return gradient;
}

// 2. Инициализация графика
const canvasElement = scope.document.getElementById('creditsChart');
if (canvasElement) {
  const canvasCtx = canvasElement.getContext('2d');
  scope.window.myChart = new Chart(canvasCtx, {
    type: 'line',
    data: {
      labels: chartData.days.labels,
      datasets: [{
        label: 'Spent Credits',
        data: chartData.days.data,
        borderColor: '#00fba5',
        borderWidth: 3,
        fill: true,
        backgroundColor: getGradient(canvasCtx),
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 20
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1a1a1c',
          titleColor: '#888',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: context => ` Spent: ${context.raw} 🪙`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#555'
          }
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: '#555'
          }
        }
      }
    }
  });
}

// 3. Функция обновления
scope.window.updateChart = function (period, event) {
  const newData = chartData[period];
  if (!newData || !scope.window.myChart) return;
  if (event && event.currentTarget) {
    scope.document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
  }
  scope.window.myChart.stop();
  scope.window.myChart.data.labels = newData.labels;
  scope.window.myChart.data.datasets[0].data = newData.data;
  scope.window.myChart.update('none');
  scope.window.myChart.update();
};

// -----------------------------------------------------------------------------------------------------------------------------

// Глобальные переменные
let currentPage = 1;
const rowsPerPage = 5;
scope.document.addEventListener('DOMContentLoaded', function () {
  initCustomSelect();
  scope.window.filterPrompts();
});

// --- Основная логика ---

scope.window.filterPrompts = function () {
  const filterValue = scope.document.getElementById('modelFilter').value;
  const allRows = scope.document.querySelectorAll('#promptsTable tbody tr');
  let visibleRows = [];

  // 2. Фильтрация
  allRows.forEach(row => {
    const model = row.getAttribute('data-model');
    row.style.display = 'none';
    row.classList.remove('filtered-match');
    const isMatch = filterValue === 'all' || model === filterValue;
    if (isMatch) {
      row.classList.add('filtered-match');
      visibleRows.push(row);
    }
  });

  // 3. Передача отфильтрованных строк в пагинатор
  renderPagination(visibleRows);
};
scope.window.resetFilterAndPage = function () {
  currentPage = 1;
  scope.window.filterPrompts();
};
function renderPagination(rows) {
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginationContainer = scope.document.getElementById('paginationControls');

  // Если нет результатов
  if (totalRows === 0) {
    paginationContainer.innerHTML = '';
    return;
  }

  // 1. Отображаем строки ТОЛЬКО для текущей страницы
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  rows.forEach((row, index) => {
    if (index >= start && index < end) {
      row.style.display = 'table-row';
      row.style.animation = 'none';
      row.offsetHeight;
      row.style.animation = 'fadeIn 0.3s ease-in-out';
    } else {
      row.style.display = 'none';
    }
  });

  // 2. Генерируем кнопки (Steam Style)
  paginationContainer.innerHTML = '';

  // Кнопка "Назад" (<)
  const prevBtn = createBtn('<', () => changePage(currentPage - 1, rows));
  prevBtn.disabled = currentPage === 1;
  paginationContainer.appendChild(prevBtn);

  // Логика цифр (1 2 3 ... 10)
  const pageNumbers = generateSteamPageNumbers(currentPage, totalPages);
  pageNumbers.forEach(num => {
    if (num === '...') {
      const span = scope.document.createElement('span');
      span.innerText = '...';
      span.className = 'pagination-dots';
      paginationContainer.appendChild(span);
    } else {
      const btn = createBtn(num, () => changePage(num, rows));
      if (num === currentPage) btn.classList.add('active');
      paginationContainer.appendChild(btn);
    }
  });

  // Кнопка "Вперед" (>)
  const nextBtn = createBtn('>', () => changePage(currentPage + 1, rows));
  nextBtn.disabled = currentPage === totalPages;
  paginationContainer.appendChild(nextBtn);
}

// Логика генерации номеров (Steam Style: до 3 нормально, потом многоточие)
function generateSteamPageNumbers(current, total) {
  if (total <= 5) {
    return Array.from({
      length: total
    }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  let rangeStart = Math.max(2, current - 1);
  let rangeEnd = Math.min(total - 1, current + 1);
  if (current <= 3) {
    rangeStart = 2;
    rangeEnd = 4;
  }
  if (current >= total - 2) {
    rangeStart = total - 3;
    rangeEnd = total - 1;
  }
  if (rangeStart > 2) {
    pages.push('...');
  }
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }
  if (rangeEnd < total - 1) {
    pages.push('...');
  }
  if (total > 1) {
    pages.push(total);
  }
  return pages;
}
function createBtn(text, onClick) {
  const btn = scope.document.createElement('button');
  btn.innerHTML = text;
  btn.className = 'page-btn';
  scope.listen(btn, 'click', onClick);
  return btn;
}
function changePage(newPage, rows) {
  if (newPage < 1) return;
  currentPage = newPage;
  renderPagination(rows);
}
function initCustomSelect() {
  const wrapper = scope.document.querySelector('.model-select-wrapper');
  if (!wrapper) return;
  const realSelect = scope.document.getElementById('modelFilter');
  const customSelect = scope.document.getElementById('customModelSelect');
  const customOptionsList = customSelect.querySelector('.custom-options');
  const currentSpan = customSelect.querySelector('.current');
  realSelect.querySelectorAll('option').forEach(option => {
    const li = scope.document.createElement('li');
    li.textContent = option.textContent;
    li.setAttribute('data-value', option.value);
    if (option.selected) {
      li.classList.add('selected');
      currentSpan.textContent = option.textContent;
    }
    scope.listen(li, 'click', () => {
      currentSpan.textContent = option.textContent;
      realSelect.value = option.value;
      customOptionsList.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
      customSelect.classList.remove('open');

      // ВАЖНО: Сбрасываем на 1 страницу при смене фильтра
      scope.window.resetFilterAndPage();
    });
    customOptionsList.appendChild(li);
  });
  scope.listen(customSelect, 'click', () => {
    customSelect.classList.toggle('open');
  });
  scope.document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) {
      customSelect.classList.remove('open');
    }
  });
}

// --- Логика для левой таблицы (Purchase History) ---

let currentPurchasePage = 1;
const purchaseRowsPerPage = 5;
scope.document.addEventListener('DOMContentLoaded', function () {
  renderPurchaseTable();
});
function renderPurchaseTable() {
  const table = scope.document.getElementById('purchaseTable');
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');
  const paginationContainer = scope.document.getElementById('purchasePagination');
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / purchaseRowsPerPage);

  // 1. Скрываем/Показываем строки
  const start = (currentPurchasePage - 1) * purchaseRowsPerPage;
  const end = start + purchaseRowsPerPage;
  rows.forEach((row, index) => {
    if (index >= start && index < end) {
      row.style.display = 'table-row';
      row.style.animation = 'none';
      row.offsetHeight;
      row.style.animation = 'fadeIn 0.3s ease-in-out';
    } else {
      row.style.display = 'none';
    }
  });

  // 2. Генерация кнопок (используем ту же Steam-логику)
  paginationContainer.innerHTML = '';
  if (totalRows === 0) return;

  // Кнопка Назад
  const prevBtn = createBtn('<', () => changePurchasePage(currentPurchasePage - 1));
  prevBtn.disabled = currentPurchasePage === 1;
  paginationContainer.appendChild(prevBtn);

  // Цифры страниц
  const pageNumbers = generateSteamPageNumbers(currentPurchasePage, totalPages);
  pageNumbers.forEach(num => {
    if (num === '...') {
      const span = scope.document.createElement('span');
      span.innerText = '...';
      span.className = 'pagination-dots';
      paginationContainer.appendChild(span);
    } else {
      const btn = createBtn(num, () => changePurchasePage(num));
      if (num === currentPurchasePage) btn.classList.add('active');
      paginationContainer.appendChild(btn);
    }
  });
  // Кнопка Вперед
  const nextBtn = createBtn('>', () => changePurchasePage(currentPurchasePage + 1));
  nextBtn.disabled = currentPurchasePage === totalPages;
  paginationContainer.appendChild(nextBtn);
}
function changePurchasePage(newPage) {
  const table = scope.document.getElementById('purchaseTable');
  const totalRows = table.querySelectorAll('tbody tr').length;
  const totalPages = Math.ceil(totalRows / purchaseRowsPerPage);
  if (newPage < 1 || newPage > totalPages) return;
  currentPurchasePage = newPage;
  renderPurchaseTable();
}
Object.defineProperty(context, "chartData", { configurable: true, get: () => chartData });
Object.defineProperty(context, "getGradient", { configurable: true, get: () => getGradient });
Object.defineProperty(context, "canvasElement", { configurable: true, get: () => canvasElement });
Object.defineProperty(context, "currentPage", { configurable: true, get: () => currentPage, set: value => { currentPage = value; } });
Object.defineProperty(context, "rowsPerPage", { configurable: true, get: () => rowsPerPage });
Object.defineProperty(context, "renderPagination", { configurable: true, get: () => renderPagination });
Object.defineProperty(context, "generateSteamPageNumbers", { configurable: true, get: () => generateSteamPageNumbers });
Object.defineProperty(context, "createBtn", { configurable: true, get: () => createBtn });
Object.defineProperty(context, "changePage", { configurable: true, get: () => changePage });
Object.defineProperty(context, "initCustomSelect", { configurable: true, get: () => initCustomSelect });
Object.defineProperty(context, "currentPurchasePage", { configurable: true, get: () => currentPurchasePage, set: value => { currentPurchasePage = value; } });
Object.defineProperty(context, "purchaseRowsPerPage", { configurable: true, get: () => purchaseRowsPerPage });
Object.defineProperty(context, "renderPurchaseTable", { configurable: true, get: () => renderPurchaseTable });
Object.defineProperty(context, "changePurchasePage", { configurable: true, get: () => changePurchasePage });
scope.expose("getGradient", getGradient);
scope.expose("renderPagination", renderPagination);
scope.expose("generateSteamPageNumbers", generateSteamPageNumbers);
scope.expose("createBtn", createBtn);
scope.expose("changePage", changePage);
scope.expose("initCustomSelect", initCustomSelect);
scope.expose("renderPurchaseTable", renderPurchaseTable);
scope.expose("changePurchasePage", changePurchasePage);

}
