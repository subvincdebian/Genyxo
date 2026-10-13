// Behavior migrated from chat-inline4; resources are owned by the React mount.

import {
  API_BASE_URL as API_ORIGIN,
  SOCKET_URL as SOCKET_ORIGIN,
} from "@/shared/config";
export default function initialize(scope, context) {
  /* --- Логика Модального Окна Поиска --- */
  scope.document.addEventListener("DOMContentLoaded", () => {
    const searchModalOverlay =
      scope.document.getElementById("searchChatsModal");
    const closeSearchBtn = scope.document.getElementById("closeSearchModal");
    const modalSearchInput = scope.document.getElementById("modalSearchInput");
    const modalSearchResults =
      scope.document.getElementById("modalSearchResults");
    const modalNewChatBtn = scope.document.getElementById("modalNewChatBtn");
    const noResultsMsg = scope.document.getElementById("searchNoResults");
    const sidebarSearchBtn = scope.document.getElementById("searchChatsBtn");
    const railSearchBtn = scope.document.getElementById("railSearchBtn");
    function openSearchModal() {
      if (!searchModalOverlay) return;
      populateModalList(); // Загружаем список чатов
      searchModalOverlay.classList.add("active");
      scope.setTimeout(() => modalSearchInput.focus(), 100);
    }
    function closeSearchModal() {
      if (!searchModalOverlay) return;
      searchModalOverlay.classList.remove("active");
      modalSearchInput.value = "";
    }

    // Закрытие по ESC
    scope.document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        searchModalOverlay.classList.contains("active")
      ) {
        closeSearchModal();
      }
    });

    // Слушатели на кнопки открытия
    if (sidebarSearchBtn)
      scope.listen(sidebarSearchBtn, "click", openSearchModal);
    if (railSearchBtn) scope.listen(railSearchBtn, "click", openSearchModal);

    // Закрытие
    if (closeSearchBtn) scope.listen(closeSearchBtn, "click", closeSearchModal);
    if (searchModalOverlay) {
      scope.listen(searchModalOverlay, "click", (e) => {
        if (e.target === searchModalOverlay) closeSearchModal();
      });
    }

    // Функция для копирования списка чатов из сайдбара в модальное окно поиска
    function populateModalList() {
      if (!modalSearchResults) return;
      modalSearchResults.innerHTML = scope.sanitizeHtml("");
      if (noResultsMsg) noResultsMsg.style.display = "none";
      const originalList = scope.document.querySelectorAll(
        "#historyList .chat-item",
      );
      if (originalList.length === 0) {
        // Если в сайдбаре пусто
        if (noResultsMsg) noResultsMsg.style.display = "block";
        return;
      }
      originalList.forEach((originalItem) => {
        // Клонируем элемент чата
        const clone = originalItem.cloneNode(true);

        // 1. Убираем лишнее: удаляем кнопку настроек (три точки) и выпадающее меню
        const optionsBtn = clone.querySelector(".chat-options-btn");
        const dropdown = clone.querySelector(".options-dropdown");
        if (optionsBtn) optionsBtn.remove();
        if (dropdown) dropdown.remove();

        // 2. Стилизуем клон для поиска
        clone.classList.remove("active"); // Убираем подсветку активного чата из сайдбара
        clone.classList.add("search-result-item");
        scope.listen(clone, "click", () => {
          // Имитируем клик по настоящему элементу в сайдбаре
          originalItem.click();
          closeSearchModal();

          // Закрываем мобильный сайдбар, если он открыт
          const sidebar = scope.document.querySelector(".sidebar");
          if (sidebar && sidebar.classList.contains("active")) {
            const closeSidebarBtn =
              scope.document.getElementById("closeSidebarBtn");
            if (closeSidebarBtn) closeSidebarBtn.click();
          }
        });
        modalSearchResults.appendChild(clone);
      });
    }

    // Живой поиск
    if (modalSearchInput) {
      scope.listen(modalSearchInput, "input", function () {
        const filter = this.value.toLowerCase();
        const items = modalSearchResults.querySelectorAll(
          ".search-result-item",
        );
        let hasVisibleItems = false;
        items.forEach((item) => {
          const text = item.textContent.toLowerCase();
          if (text.includes(filter)) {
            item.style.display = "flex";
            hasVisibleItems = true;
          } else {
            item.style.display = "none";
          }
        });
        if (noResultsMsg)
          noResultsMsg.style.display = hasVisibleItems ? "none" : "block";
      });
    }

    // Кнопка "Новый чат"
    if (modalNewChatBtn) {
      scope.listen(modalNewChatBtn, "click", () => {
        const realNewChatBtn = scope.document.getElementById("newChatBtn");
        if (realNewChatBtn) realNewChatBtn.click();
        closeSearchModal();
      });
    }
  });
}
