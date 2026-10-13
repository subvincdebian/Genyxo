// Behavior migrated from dashboard.js; resources are owned by the React mount.
import { Chart } from "chart.js/auto";
import {
  API_BASE_URL as API_ORIGIN,
  SOCKET_URL as SOCKET_ORIGIN,
} from "@/shared/config";
export default function initialize(scope, context) {
  scope.document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    const navAvatarImg = scope.document.getElementById("navAvatarImg");
    const dropdownAvatars = scope.document.getElementById("dropdownAvatars");
    const menuName = scope.document.getElementById("menuName");
    const menuEmail = scope.document.getElementById("menuEmail");
    const menuCredits = scope.document.getElementById("menuCredits");
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData) {
      if (userData.avatar) {
        if (navAvatarImg) navAvatarImg.src = userData.avatar;
        if (dropdownAvatars) dropdownAvatars.src = userData.avatar;
      }
      if (userData.fullName && menuName) {
        menuName.textContent = userData.fullName;
      }
      if (userData.email && menuEmail) {
        menuEmail.textContent = userData.email;
      }
      if (userData.credits && menuCredits) {
        menuCredits.textContent = userData.credits;
      }
    }
    if (!userData.avatar && navAvatarImg) {
      const username = userData.fullName || userData.email || "User";
      navAvatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
      if (dropdownAvatars) {
        dropdownAvatars.src = navAvatarImg.src;
      }
    }

    // DROPDOWN MENU FUNCTIONALITY
    const profileToggle = scope.document.getElementById("profileToggle");
    const profileDropdown = scope.document.getElementById("profileDropdown");
    const closeProfilePanel =
      scope.document.getElementById("closeProfilePanel");
    if (profileToggle && profileDropdown) {
      // Toggle dropdown on button click
      scope.listen(profileToggle, "click", function (e) {
        e.stopPropagation();
        profileDropdown.classList.toggle("show-dropdown");
      });

      // Close dropdown on close button click
      if (closeProfilePanel) {
        scope.listen(closeProfilePanel, "click", function (e) {
          e.stopPropagation();
          profileDropdown.classList.remove("show-dropdown");
        });
      }

      // Close dropdown when clicking outside
      scope.document.addEventListener("click", function (e) {
        if (
          !profileToggle.contains(e.target) &&
          !profileDropdown.contains(e.target)
        ) {
          profileDropdown.classList.remove("show-dropdown");
        }
      });

      // Prevent dropdown from closing when clicking inside it
      scope.listen(profileDropdown, "click", function (e) {
        e.stopPropagation();
      });
    }

    // TAB SWITCHING FUNCTIONALITY
    const menuItems = scope.document.querySelectorAll(
      ".admin-menu-item[data-tab]",
    );
    const tabContents = scope.document.querySelectorAll(".tab-content");
    menuItems.forEach((item) => {
      scope.listen(item, "click", (e) => {
        e.preventDefault();
        const targetTab = item.getAttribute("data-tab");

        // Remove active class from all menu items
        menuItems.forEach((i) => i.classList.remove("active"));
        // Add active class to clicked item
        item.classList.add("active");

        // Hide all tab contents
        tabContents.forEach((tab) => {
          tab.classList.remove("active");
        });

        // Show target tab
        const targetContent = scope.document.getElementById("tab-" + targetTab);
        if (targetContent) {
          targetContent.classList.add("active");
          // Scroll to top of main content
          scope.document.querySelector(".admin-main").scrollTop = 0;
        }
      });
    });

    // CHART INITIALIZATION
    const ctx = scope.document.getElementById("adminGlobalChart");
    if (ctx) {
      const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, "rgba(16, 230, 204, 0.4)");
      gradient.addColorStop(1, "rgba(16, 230, 204, 0)");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [
            {
              label: "Global Credits Spent",
              data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
              borderColor: "#10e6cc",
              backgroundColor: gradient,
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#121212",
              pointBorderColor: "#10e6cc",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(0,0,0,0.8)",
              titleFont: {
                family: "Inter",
                size: 13,
              },
              bodyFont: {
                family: "Inter",
                size: 14,
                weight: "bold",
              },
              padding: 12,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: function (context) {
                  return context.parsed.y + " 🪙";
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
                drawBorder: false,
              },
              ticks: {
                color: "#8a8a8a",
                font: {
                  family: "Inter",
                },
              },
            },
            x: {
              grid: {
                display: false,
                drawBorder: false,
              },
              ticks: {
                color: "#8a8a8a",
                font: {
                  family: "Inter",
                },
              },
            },
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
        },
      });
    }

    // LIVE ONLINE COUNTER
    const onlineEl = scope.document.getElementById("liveOnlineCount");
    if (onlineEl) {
      scope.setInterval(() => {
        let current = parseInt(onlineEl.innerText);
        let change = Math.floor(Math.random() * 5) - 2;
        if (current + change > 0) {
          onlineEl.innerText = current + change + " Users Online";
        }
      }, 5000);
    }

    // BUTTON EVENT HANDLERS
    const exportUsersBtn = scope.document.getElementById("exportUsersBtn");
    const addPromptBtn = scope.document.getElementById("addPromptBtn");
    const reportSalesBtn = scope.document.getElementById("reportSalesBtn");
    if (exportUsersBtn) {
      scope.listen(exportUsersBtn, "click", () => {
        alert("Export functionality will be implemented soon");
      });
    }
    if (addPromptBtn) {
      scope.listen(addPromptBtn, "click", () => {
        alert("Add prompt functionality will be implemented soon");
      });
    }
    if (reportSalesBtn) {
      scope.listen(reportSalesBtn, "click", () => {
        alert("Report generation functionality will be implemented soon");
      });
    }

    // TIME FILTER BUTTONS
    const filterBtns = scope.document.querySelectorAll(".filter-btn");
    filterBtns.forEach((btn) => {
      scope.listen(btn, "click", function () {
        filterBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
      });
    });

    // LOGOUT BUTTON
    const dropdownLogoutBtn =
      scope.document.getElementById("dropdownLogoutBtn");
    if (dropdownLogoutBtn) {
      scope.listen(dropdownLogoutBtn, "click", () => {
        if (confirm("Are you sure you want to logout?")) {
          // Clear session/token and redirect
          localStorage.removeItem("token");
          scope.window.location.href = "index.html";
        }
      });
    }

    // SMOOTH SCROLL FOR MAIN CONTENT
    const adminMain = scope.document.querySelector(".admin-main");
    if (adminMain) {
      // Optional: Add smooth behavior to scrolling
      scope.listen(adminMain, "wheel", (e) => {
        // Custom scroll behavior can be added here if needed
      });
    }

    // RESPONSIVE SIDEBAR HANDLING
    let lastClickedTab = "overview";
    menuItems.forEach((item) => {
      scope.listen(item, "click", () => {
        lastClickedTab = item.getAttribute("data-tab");
        // Store in session for page reload
        sessionStorage.setItem("lastAdminTab", lastClickedTab);
      });
    });

    // Restore last tab on page load
    const lastTab = sessionStorage.getItem("lastAdminTab");
    if (lastTab && lastTab !== "null") {
      const tabToActivate = scope.document.querySelector(
        `[data-tab="${lastTab}"]`,
      );
      if (tabToActivate) {
        tabToActivate.click();
      }
    }

    // ==========================================================================
    // ЛОГИКА УПРАВЛЕНИЯ МОБИЛЬНЫМ САЙДБАРОМ
    // ==========================================================================
    const sidebarToggle = scope.document.getElementById("sidebarToggle");
    const sidebarClose = scope.document.getElementById("sidebarClose");
    const sidebarOverlay = scope.document.getElementById("sidebarOverlay");
    const adminSidebar =
      scope.document.querySelector(".admin-sidebar") ||
      scope.document.querySelector(".sidebar");
    const sidebarLinks = scope.document.querySelectorAll(
      ".admin-sidebar a, .sidebar-menu li, .menu-item",
    );
    if (sidebarToggle && adminSidebar && sidebarOverlay) {
      // Функция открытия меню
      const openMobileSidebar = () => {
        adminSidebar.classList.add("active");
        sidebarOverlay.classList.add("active");
        scope.document.body.style.overflow = "hidden"; // Блокируем скролл страницы под меню
      };

      // Функция закрытия меню
      const closeMobileSidebar = () => {
        adminSidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
        scope.document.body.style.overflow = ""; // Возвращаем скролл
      };

      // Навешиваем события клика
      scope.listen(sidebarToggle, "click", (e) => {
        e.stopPropagation();
        openMobileSidebar();
      });
      if (sidebarClose) {
        scope.listen(sidebarClose, "click", closeMobileSidebar);
      }
      scope.listen(sidebarOverlay, "click", closeMobileSidebar);

      // Автоматически закрываем сайдбар при клике на любой пункт меню (актуально для мобилок)
      sidebarLinks.forEach((link) => {
        scope.listen(link, "click", () => {
          if (scope.window.innerWidth <= 992) {
            closeMobileSidebar();
          }
        });
      });
    }
  });
}
