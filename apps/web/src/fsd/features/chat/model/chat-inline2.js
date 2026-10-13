// Behavior migrated from chat-inline2; resources are owned by the React mount.

import {
  API_BASE_URL as API_ORIGIN,
  SOCKET_URL as SOCKET_ORIGIN,
} from "@/shared/config";
export default function initialize(scope, context) {
  scope.document.addEventListener("DOMContentLoaded", () => {
    const mobileBtn = scope.document.getElementById("sidebarToggle");
    const sidebar = scope.document.getElementById("sidebar");
    const overlay = scope.document.getElementById("sidebar-overlay");
    const body = scope.document.body;
    const closeMenu = () => {
      sidebar.classList.remove("mobile-open");
      overlay.classList.remove("active");
    };

    // 1. Клик по кнопке "бургер" (открытие/закрытие)
    if (mobileBtn) {
      scope.listen(mobileBtn, "click", (e) => {
        e.stopPropagation();
        sidebar.classList.toggle("mobile-open");
        overlay.classList.toggle("active");
      });
    }

    // 2. КЛИК ПО ПУСТОМУ МЕСТУ (Оверлею)
    if (overlay) {
      scope.listen(overlay, "click", () => {
        closeMenu();
      });
    }

    // 3. Свайп влево для закрытия
    let touchStartX = 0;
    let touchEndX = 0;
    scope.listen(
      sidebar,
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      {
        passive: true,
      },
    );
    scope.listen(
      sidebar,
      "touchend",
      (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) closeMenu();
      },
      {
        passive: true,
      },
    );

    // 4. Закрытие при клике на крестик внутри сайдбара
    const closeBtnInside = scope.document.querySelector(".sb-header .icon-btn");
    if (closeBtnInside) {
      scope.listen(closeBtnInside, "click", closeMenu);
    }
  });
}
