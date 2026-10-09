// Behavior migrated from script.js; resources are owned by the React mount.
import { io } from "socket.io-client";
import confetti from "canvas-confetti";
import {
  API_BASE_URL as API_ORIGIN,
  SOCKET_URL as SOCKET_ORIGIN,
} from "@/shared/config";
export default function initialize(scope, context) {
  var API_BASE_URL = API_ORIGIN;
  let socket;
  let pollingInterval = null;
  let verificationGeneration = 0;
  let verificationRequest = null;
  let currentProduct = null;
  const urlParams = new URLSearchParams(scope.window.location.search);
  const tokenFromUrl = urlParams.get("token");
  const refCode = urlParams.get("referralCode") || urlParams.get("ref");
  if (tokenFromUrl) {
    localStorage.setItem("authToken", tokenFromUrl);
    scope.window.token = tokenFromUrl;
  }
  if (refCode) {
    localStorage.setItem("pending_referral_code", refCode);
  }
  if (tokenFromUrl || refCode) {
    const cleanUrl =
      scope.window.location.origin + scope.window.location.pathname;
    scope.window.history.replaceState({}, scope.document.title, cleanUrl);
  }
  let token = localStorage.getItem("authToken");
  scope.window.token = token;
  let currentUserName = localStorage.getItem("userName") || "Username";
  let currentUserEmail = localStorage.getItem("userEmail");
  let currentUserAvatar = localStorage.getItem("userAvatar");
  let currentUserRole = localStorage.getItem("userRole");

  // --- DOM Elements ---
  const productsGrid = scope.document.getElementById("productsGrid");

  // Login / Profile Elements
  const loginModal = scope.document.getElementById("loginModal");
  const loginBtn = scope.document.getElementById("loginBtn");
  const closeLogin = scope.document.getElementById("closeLogin");
  const showSignup = scope.document.getElementById("showSignup");
  const showLogin = scope.document.getElementById("showLogin");
  const logoutContainer = scope.document.getElementById("logoutContainer");
  const logoutBtn = scope.document.getElementById("logoutBtn");
  const welcomeMessage = scope.document.getElementById("welcomeMessage");
  const affLink = scope.document.getElementById("referralLinkInput");

  // Profile Panel Elements
  const profilePanel = scope.document.getElementById("profilePanel");
  const navUsername = scope.document.getElementById("navUsername");
  const navAvatar = scope.document.getElementById("navAvatar");
  const navIcon = scope.document.getElementById("navIcon");
  const menuName = scope.document.getElementById("menuName");
  const menuEmail = scope.document.getElementById("menuEmail");
  const menuCredits = scope.document.getElementById("menuCredits");
  const dropdownAvatars = scope.document.querySelectorAll(".dropdown-avatar");
  const dropdownLogoutBtn = scope.document.getElementById("dropdownLogoutBtn");
  const notificationBadge = scope.document.getElementById("notificationBadge");
  const closeProfilePanelBtn =
    scope.document.getElementById("closeProfilePanel");
  const creditBalance = scope.document.getElementById("creditBalance");

  // Checkout Elements (НОВІ)
  const checkoutModal = scope.document.getElementById("checkoutModal");
  const closeCheckoutBtn = scope.document.getElementById("closeCheckout");
  const payBtn = scope.document.getElementById("payBtn");

  // Search & Nav
  const searchInput = scope.document.querySelector(".search-input");
  const exploreBtn = scope.document.getElementById("exploreBtn");
  const navLinks = scope.document.querySelectorAll(".nav-link");
  const products = [
    {
      id: 1,
      price: "$3.99",
      image: "./images/startai.jpg",
      alt: "StartAI Pack",
    },
    {
      id: 2,
      price: "$9.99",
      image: "./images/aiexplorer.jpg",
      alt: "AI Explorer Pack",
    },
    {
      id: 3,
      price: "$24.99",
      image: "./images/procreatorai.jpg",
      alt: "Pro Creator AI Pack",
    },
    {
      id: 4,
      price: "$49.99",
      image: "./images/aimaster.jpg",
      alt: "AI Master Pack",
    },
    {
      id: 5,
      price: "$99.99",
      image: "./images/unlimitedpower.jpg",
      alt: "Unlimited Power Pack",
    },
    {
      id: 6,
      price: "$219.99",
      image: "./images/aititan.jpg",
      alt: "AI Titan Pack",
    },
  ];
  const SVG_ICONS = {
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    bolt: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  };
  function updateBalanceUI(amount) {
    const numericAmount = parseFloat(amount) || 0;
    const formattedAmount = numericAmount.toLocaleString();
    const creditBalanceEl =
      scope.document.getElementById("creditBalance") ||
      scope.document.querySelector(".credit-balance");
    const menuCreditsEl = scope.document.getElementById("menuCredits");
    if (creditBalanceEl) {
      if (creditBalanceEl.textContent !== formattedAmount) {
        creditBalanceEl.textContent = formattedAmount;
      }
      creditBalanceEl.setAttribute(
        "aria-label",
        `Your balance: ${formattedAmount} credits.`,
      );
    }
    if (menuCreditsEl) {
      if (menuCreditsEl.textContent !== formattedAmount) {
        menuCreditsEl.textContent = formattedAmount;
      }
      menuCreditsEl.setAttribute(
        "aria-label",
        `Your balance in menu: ${formattedAmount} credits.`,
      );
    }
    localStorage.setItem("userCredits", numericAmount);
  }
  function updateUIState(isLoggedIn, userData = null) {
    const userName = userData?.name || userData?.email || "User";
    const userAvatarUrl =
      userData?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`;
    if (isLoggedIn && userData) {
      if (navUsername && navUsername.textContent !== userName) {
        navUsername.textContent = userName;
      }
      if (navIcon) navIcon.style.display = "none";
      if (navAvatar) {
        navAvatar.style.display = "block";
        if (navAvatar.src !== userAvatarUrl) navAvatar.src = userAvatarUrl;
        navAvatar.alt = `User Avatar ${userName}`;
      }
      if (menuName && menuName.textContent !== userName)
        menuName.textContent = userName;
      if (menuEmail && menuEmail.textContent !== (userData.email || ""))
        menuEmail.textContent = userData.email || "";
      if (dropdownAvatars) {
        dropdownAvatars.forEach((img) => {
          if (img.src !== userAvatarUrl) img.src = userAvatarUrl;
          img.alt = `User Avatar ${userName}`;
        });
      }
      if (userData.credits !== undefined && menuCredits) {
        const formattedCredits = parseFloat(userData.credits).toLocaleString();
        if (menuCredits.textContent !== formattedCredits) {
          menuCredits.textContent = formattedCredits;
        }
      }
      if (loginBtn) {
        loginBtn.classList.remove("login-btn");
        loginBtn.classList.add("profile-toggle-btn");
        loginBtn.setAttribute("role", "button");
        loginBtn.setAttribute("aria-haspopup", "true");
        loginBtn.setAttribute("aria-expanded", "false"); // will be true while open panel
        loginBtn.setAttribute("aria-label", "Open profile panel");
      }
    } else {
      // Guest
      if (navUsername && navUsername.textContent !== "Register / Login") {
        navUsername.textContent = "Register / Login";
      }
      if (navIcon) navIcon.style.display = "inline-block";
      if (navAvatar) navAvatar.style.display = "none";
      if (loginBtn) {
        loginBtn.classList.remove("profile-toggle-btn");
        loginBtn.classList.add("login-btn");
        loginBtn.removeAttribute("aria-haspopup");
        loginBtn.removeAttribute("aria-expanded");
        loginBtn.setAttribute("aria-label", "Login or Register in system");
      }
      if (profilePanel) profilePanel.classList.remove("show");
    }
    scope.document.dispatchEvent(new Event("genyxo:session"));
  }
  function renderBadge(count) {
    if (!notificationBadge) return;
    const numericCount = parseInt(count, 10) || 0;
    if (numericCount > 0) {
      const badgeText = numericCount > 99 ? "99+" : String(numericCount);
      if (notificationBadge.innerText !== badgeText) {
        notificationBadge.innerText = badgeText;
      }
      notificationBadge.style.display = "flex";
      notificationBadge.setAttribute(
        "aria-label",
        `You have ${numericCount} new messages`,
      );
    } else {
      notificationBadge.style.display = "none";
      notificationBadge.removeAttribute("aria-label");
    }
  }
  async function updateNotificationsBadge() {
    if (!token) return;
    try {
      const response = await scope.fetch(
        `${API_BASE_URL}/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      if ([401, 403].includes(response.status)) {
        console.warn("Session or token expired. Auto logout...");
        handleLogout();
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }
      const data = await response.json();
      const count =
        typeof data.count === "number"
          ? data.count
          : parseInt(data.count, 10) || 0;
      renderBadge(count);
    } catch (e) {
      console.warn("Failed to update notification counter:", e.message);
    }
  }
  function handleLogout() {
    stopPolling();
    if (socket && typeof socket.disconnect === "function") {
      socket.disconnect();
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    const userKeys = [
      "authToken",
      "userName",
      "userEmail",
      "userAvatar",
      "userRole",
      "userCredits",
      "userId",
    ];
    userKeys.forEach((key) => localStorage.removeItem(key));
    token = null;
    if (scope.window.token) scope.window.token = null;
    currentUserName = "Username";
    currentUserEmail = null;
    currentUserAvatar = null;
    currentUserRole = null;
    updateUIState(false);
    scope.window.location.reload();
    scope.document.dispatchEvent(new Event("genyxo:session"));
  }
  function updateAdminDashboardVisibility() {
    const role = currentUserRole || localStorage.getItem("userRole");
    const dashboardBtn = scope.document.querySelector(
      'a[href="dashboard.html"]',
    );
    if (!dashboardBtn) return;
    const isAdmin = role === "admin";
    if (isAdmin) {
      dashboardBtn.removeAttribute("hidden");
      if (dashboardBtn.style.display === "none") {
        dashboardBtn.style.display = "";
      }
    } else {
      dashboardBtn.setAttribute("hidden", "true");
    }
  }
  async function loadAffiliateData() {
    const els = {
      balance: scope.document.getElementById("affiliateBalance"),
      link: scope.document.getElementById("referralLinkInput"),
      invited: scope.document.getElementById("invitedCount"),
    };
    if (!token) return;
    try {
      const response = await scope.fetch(`${API_BASE_URL}/profile/affiliate`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const { balance = 0, referralLink = "", invitedCount = 0 } = data;
      if (els.balance) {
        els.balance.textContent = Number(balance).toFixed(2);
      }
      if (els.link) {
        els.link.value = referralLink || "Link not available";
      }
      if (els.invited) {
        els.invited.textContent = invitedCount;
      }
    } catch (e) {
      console.error("Affiliate load error:", e);
      if (els.balance) els.balance.textContent = "0.00";
      if (els.link) els.link.value = "Failed to load link";
    }
  }
  async function fetchUserData() {
    const affBalance = scope.document.getElementById("affiliateBalance");
    try {
      const response = await scope.fetch(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const user = await response.json();
        localStorage.setItem("userName", user.name || "");
        localStorage.setItem("userEmail", user.email || "");
        if (user.avatar) localStorage.setItem("userAvatar", user.avatar);
        if (user.role) localStorage.setItem("userRole", user.role);
        updateUIState(true, user);
        updateAdminDashboardVisibility();
        updateNotificationsBadge();
        if (affBalance !== null && affBalance !== undefined) {
          loadAffiliateData();
        }
      } else {
        console.warn("Token expired or invalid");
        handleLogout();
      }
    } catch (e) {
      console.error("Loading Profile Error:", e);
    }
  }
  async function fetchUserProfile(token) {
    try {
      const res = await scope.fetch(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("userId", user.id);
        if (user.name) localStorage.setItem("userName", user.name);
        if (user.avatar) localStorage.setItem("userAvatar", user.avatar);
        updateUIState(true, user);
      } else {
        localStorage.removeItem("authToken");
        updateUIState(false);
      }
    } catch (e) {
      console.error("Profile fetch error", e);
      localStorage.removeItem("authToken");
      updateUIState(false);
    }
  }
  function showToast(message, type = "success", duration = 3000) {
    const container = scope.document.getElementById("toast-container");
    if (!container) {
      console.warn("Toast container not found");
      return;
    }
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      info: "fa-info-circle",
    };
    const toast = scope.document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = scope.sanitizeHtml(`
        <i class="fas ${icons[type] || "fa-info-circle"}"></i>
        <span>${message}</span>
    `);
    container.appendChild(toast);
    scope.requestAnimationFrame(() => {
      toast.style.animation = "slideInToast 0.3s forwards";
    });
    const hideMs = Number(duration) || 3000;
    const hideAnimMs = 300;
    const hideTimer = scope.setTimeout(() => {
      toast.style.animation = "";
      void toast.offsetWidth;
      toast.classList.add("hiding");
      const removeFallback = scope.setTimeout(() => {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      }, hideAnimMs + 50);
      scope.listen(toast, "animationend", function onAnim(e) {
        if (e.target !== toast) return;
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
        clearTimeout(removeFallback);
        toast.removeEventListener("animationend", onAnim);
      });
    }, hideMs);
    return {
      hideTimer,
      element: toast,
    };
  }
  function initGlobalSockets() {
    if (!token || typeof io === "undefined") return;
    if (socket) socket.disconnect();
    socket = io(`${SOCKET_ORIGIN}/notifications`, {
      withCredentials: true,
      auth: {
        token,
      },
    });
    socket.on("unread_count_update", (data) => {
      renderBadge(data.count);
    });
    socket.on("new_notification", (n) => {
      if (typeof showToast === "function") {
        showToast(`${n.title}: ${n.message}`, "info");
      }
      scope.document.dispatchEvent(
        new CustomEvent("genyxo:notification", {
          detail: n,
        }),
      );
    });
  }
  async function loadProfileData() {
    if (!token) {
      const protectedPages = [
        "profile.html",
        "notifications.html",
        "support.html",
      ];
      if (
        protectedPages.some((page) =>
          scope.window.location.pathname.includes(page),
        )
      ) {
        scope.window.location.href = "index.html";
      }
      return;
    }
    try {
      const response = await scope.fetch(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      const user = await response.json();
      const elements = {
        navUsername: scope.document.getElementById("navUsername"),
        navIcon: scope.document.getElementById("navIcon"),
        navAvatar: scope.document.getElementById("navAvatar"),
        loginBtn: scope.document.getElementById("loginBtn"),
        menuName: scope.document.getElementById("menuName"),
        menuEmail: scope.document.getElementById("menuEmail"),
        menuCredits: scope.document.getElementById("menuCredits"),
        dropdownAvatar: scope.document.querySelector(".dropdown-avatar"),
      };
      if (user.id) {
        const avatarUrl =
          user.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
        if (elements.navUsername)
          elements.navUsername.textContent = user.name || "Profile";
        if (elements.navIcon) elements.navIcon.style.display = "none";
        if (elements.navAvatar) {
          elements.navAvatar.src = avatarUrl;
          elements.navAvatar.style.display = "inline-block";
          elements.navAvatar.alt = "User Avatar";
        }
        if (elements.menuName)
          elements.menuName.textContent = user.name || "User";
        if (elements.menuEmail)
          elements.menuEmail.textContent = user.email || "";
        if (elements.menuCredits)
          elements.menuCredits.textContent = (
            user.credits || 0
          ).toLocaleString();
        if (elements.dropdownAvatar) {
          elements.dropdownAvatar.src = avatarUrl;
          elements.dropdownAvatar.alt = "User Avatar";
        }
      }
      const profileName = scope.document.getElementById("profileName");
      if (profileName) profileName.textContent = user.name || "User";
      const avatarPreview = scope.document.getElementById("avatarPreview");
      if (avatarPreview && user.avatar) {
        avatarPreview.style.backgroundImage = `url("${user.avatar}")`;
        avatarPreview.alt = "User Avatar";
      } else if (avatarPreview && user.name) {
        avatarPreview.style.backgroundImage = `url("https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}")`;
        avatarPreview.alt = "User Avatar";
      }
      const nameInput = scope.document.querySelector(
        'input[placeholder="John Doe"]',
      );
      if (nameInput) nameInput.value = user.name || "";
      const emailInput = scope.document.querySelector(
        'input[placeholder="your@email.com"]',
      );
      if (emailInput) emailInput.value = user.email || "";
      const logoutBtn = scope.document.getElementById("dropdownLogoutBtn");
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          localStorage.removeItem("authToken");
          scope.window.location.href = "index.html";
        };
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  }
  function checkPaymentStatus() {
    if (scope.window.location.hash === "#success") {
      history.pushState(
        "",
        scope.document.title,
        scope.window.location.pathname + scope.window.location.search,
      );
      const msg =
        scope.window.i18n?.translations?.toasts?.payment_success ||
        "Payment successful!";
      showToast(msg, "Payment successful! Credits added.", "success");
      var duration = 3 * 1000;
      var animationEnd = Date.now() + duration;
      var defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 0,
      };
      function randomInOut(min, max) {
        return Math.random() * (max - min) + min;
      }
      var interval = scope.setInterval(function () {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        var particleCount = 50 * (timeLeft / duration);
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: {
              x: randomInOut(0.1, 0.3),
              y: Math.random() - 0.2,
            },
          }),
        );
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: {
              x: randomInOut(0.7, 0.9),
              y: Math.random() - 0.2,
            },
          }),
        );
      }, 250);
    } else if (scope.window.location.hash === "#cancel") {
      history.pushState(
        "",
        scope.document.title,
        scope.window.location.pathname + scope.window.location.search,
      );
      const msg =
        scope.window.i18n?.translations?.toasts?.payment_cancel ||
        "Payment cancelled.";
      showToast(msg, "Payment cancelled.", "error");
    }
  }
  function openCheckout(product) {
    currentProduct = product;
    const productTrans =
      scope.window.AppI18n?.translations?.products_data?.[product.id]
        ? scope.window.AppI18n.translations.products_data[product.id]
        : {
            name: "AI Pack",
            credits_label: "Credits",
          };
    scope.document.getElementById("checkoutImg").src = product.image;
    scope.document.getElementById("checkoutImg").alt = productTrans.name;
    scope.document.getElementById("checkoutName").textContent =
      productTrans.name;
    scope.document.getElementById("checkoutCredits").textContent =
      (productTrans.credits_label || productTrans.credits || "").replace(/\D/g, "");
    scope.document.getElementById("checkoutPrice").textContent = product.price;
    scope.document.getElementById("checkoutTotal").textContent = product.price;
    checkoutModal.style.display = "flex";
    scope.document.body.style.overflow = "hidden";
  }
  function showLoginForm() {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
  }
  function openLoginModal() {
    const loginFormEl = scope.document.getElementById("loginForm");
    const signupFormEl = scope.document.getElementById("signupForm");
    if (!loginModal || !loginFormEl || !signupFormEl) {
      scope.window.location.href = "index.html#login";
      return;
    }
    loginModal.style.display = "flex";
    scope.document.body.style.overflow = "hidden";
    if (logoutContainer) {
      logoutContainer.style.display = "none";
    }
    showLoginForm();
  }
  function closeLoginModal() {
    loginModal.style.display = "none";
    scope.document.body.style.overflow = "auto";
    loginForm.reset();
    signupForm.reset();
  }
  function showSignupForm() {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
  }
  async function processPayment() {
    if (!token) {
      checkoutModal.style.display = "none";
      openLoginModal();
      return;
    }
    if (!currentProduct) return;
    payBtn.classList.add("loading");
    payBtn.disabled = true;
    try {
      const response = await scope.fetch(`${API_BASE_URL}/payment/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packId: currentProduct.id,
        }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        scope.window.location.href = data.url;
      } else {
        showToast(
          `Error: ${data.message || "Failed to create payment"}`,
          "error",
        );
        payBtn.classList.remove("loading");
        payBtn.disabled = false;
      }
    } catch (error) {
      console.error(error);
      showToast("Connection error. Please try again.", "error");
      payBtn.classList.remove("loading");
      payBtn.disabled = false;
    }
  }
  function getSvgIllustration(id) {
    const illustrations = {
      1: `
        <svg class="svg-illustration" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="150" fill="url(#glow1)" opacity="0.3"/>
            <path d="M200 80 L220 200 L200 240 L180 200 Z" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
            <circle cx="200" cy="140" r="15" fill="#0a0a0a" stroke="#10b981" stroke-width="2"/>
            <circle cx="200" cy="140" r="8" fill="#10b981" opacity="0.5"/>
            <path d="M180 180 L160 220 L180 210 Z" fill="#10b981"/>
            <path d="M220 180 L240 220 L220 210 Z" fill="#10b981"/>
            <path d="M185 240 Q190 270 195 290 L190 260 L185 240 Z" fill="#10b981" opacity="0.8"/>
            <path d="M200 240 Q200 280 200 310 L200 270 L200 240 Z" fill="#10b981"/>
            <path d="M215 240 Q210 270 205 290 L210 260 L215 240 Z" fill="#10b981" opacity="0.8"/>
            <circle cx="120" cy="150" r="6" fill="#10b981"/>
            <circle cx="280" cy="150" r="6" fill="#10b981"/>
            <circle cx="140" cy="100" r="4" fill="#10b981" opacity="0.7"/>
            <circle cx="260" cy="100" r="4" fill="#10b981" opacity="0.7"/>
            <line x1="120" y1="150" x2="180" y2="160" stroke="#10b981" stroke-width="1" opacity="0.3"/>
            <line x1="280" y1="150" x2="220" y2="160" stroke="#10b981" stroke-width="1" opacity="0.3"/>
            <circle cx="150" cy="90" r="2" fill="#ffffff" opacity="0.6"/>
            <circle cx="250" cy="110" r="2" fill="#ffffff" opacity="0.6"/>
            <defs><radialGradient id="glow1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.4"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/></radialGradient></defs>
        </svg>`,
      2: `
        <svg class="svg-illustration" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="140" fill="url(#glow2)" opacity="0.25"/>
            <circle cx="200" cy="200" r="120" stroke="#10b981" stroke-width="3"/>
            <circle cx="200" cy="200" r="100" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
            <line x1="200" y1="80" x2="200" y2="110" stroke="#10b981" stroke-width="4" stroke-linecap="round"/>
            <line x1="320" y1="200" x2="290" y2="200" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <line x1="200" y1="320" x2="200" y2="290" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <line x1="80" y1="200" x2="110" y2="200" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <line x1="250" y1="150" x2="270" y2="130" stroke="#10b981" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
            <line x1="250" y1="250" x2="270" y2="270" stroke="#10b981" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
            <line x1="150" y1="250" x2="130" y2="270" stroke="#10b981" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
            <line x1="150" y1="150" x2="130" y2="130" stroke="#10b981" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
            <path d="M200 200 L190 140 L200 150 L210 140 Z" fill="#10b981"/>
            <path d="M200 200 L190 260 L200 250 L210 260 Z" fill="#10b981" opacity="0.5"/>
            <circle cx="200" cy="200" r="8" fill="#0a0a0a" stroke="#10b981" stroke-width="2"/>
            <circle cx="200" cy="80" r="8" fill="#10b981"/>
            <circle cx="280" cy="120" r="6" fill="#10b981" opacity="0.8"/>
            <circle cx="320" cy="200" r="6" fill="#10b981" opacity="0.7"/>
            <circle cx="280" cy="280" r="6" fill="#10b981" opacity="0.7"/>
            <circle cx="200" cy="320" r="6" fill="#10b981" opacity="0.7"/>
            <circle cx="120" cy="280" r="6" fill="#10b981" opacity="0.7"/>
            <circle cx="80" cy="200" r="6" fill="#10b981" opacity="0.7"/>
            <circle cx="120" cy="120" r="6" fill="#10b981" opacity="0.8"/>
            <path d="M 200 200 Q 240 160, 280 120" stroke="#ffffff" stroke-width="1.5" opacity="0.3" stroke-dasharray="3 3"/>
            <defs><radialGradient id="glow2"><stop offset="0%" stop-color="#10b981" stop-opacity="0.5"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/></radialGradient></defs>
        </svg>`,
      3: `
        <svg class="svg-illustration" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="200" cy="200" rx="160" ry="140" fill="url(#glow3)" opacity="0.3"/>
            <rect x="140" y="100" width="120" height="40" rx="5" fill="#10b981" opacity="0.2" stroke="#10b981" stroke-width="2"/>
            <rect x="140" y="140" width="120" height="140" rx="5" fill="none" stroke="#10b981" stroke-width="3"/>
            <path d="M170 280 L200 320 L230 280 Z" fill="#10b981"/>
            <rect x="180" y="280" width="40" height="15" fill="#10b981" opacity="0.6"/>
            <circle cx="165" cy="120" r="8" fill="#10b981"/>
            <circle cx="200" cy="120" r="8" fill="#10b981"/>
            <circle cx="235" cy="120" r="8" fill="#10b981"/>
            <rect x="150" y="155" width="100" height="110" rx="3" fill="#0a0a0a" stroke="#10b981" stroke-width="1.5"/>
            <path d="M 170 180 Q 175 175, 180 180 Q 185 175, 190 180 Q 195 175, 200 180 Q 205 175, 210 180 Q 215 175, 220 180 Q 225 175, 230 180" stroke="#10b981" stroke-width="2" fill="none" opacity="0.8"/>
            <path d="M 170 200 Q 175 195, 180 200 Q 185 195, 190 200 Q 195 195, 200 200 Q 205 195, 210 200 Q 215 195, 220 200 Q 225 195, 230 200" stroke="#10b981" stroke-width="2" fill="none" opacity="0.6"/>
            <path d="M 170 220 Q 175 215, 180 220 Q 185 215, 190 220 Q 195 215, 200 220 Q 205 215, 210 220 Q 215 215, 220 220 Q 225 215, 230 220" stroke="#10b981" stroke-width="2" fill="none" opacity="0.4"/>
            <circle cx="170" cy="180" r="3" fill="#10b981"/>
            <circle cx="190" cy="180" r="3" fill="#10b981"/>
            <circle cx="210" cy="180" r="3" fill="#10b981"/>
            <circle cx="230" cy="180" r="3" fill="#10b981"/>
            <path d="M 280 140 L 285 150 L 295 145 L 287 155 L 295 165 L 285 160 L 280 170 L 275 160 L 265 165 L 273 155 L 265 145 L 275 150 Z" fill="#10b981" opacity="0.7"/>
            <path d="M 120 170 L 123 177 L 131 174 L 125 181 L 131 189 L 123 186 L 120 193 L 117 186 L 109 189 L 115 181 L 109 174 L 117 177 Z" fill="#10b981" opacity="0.6"/>
            <path d="M 270 240 L 272 245 L 278 243 L 274 248 L 278 254 L 272 252 L 270 257 L 268 252 L 262 254 L 266 248 L 262 243 L 268 245 Z" fill="#10b981" opacity="0.5"/>
            <defs><radialGradient id="glow3"><stop offset="0%" stop-color="#10b981" stop-opacity="0.4"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/></radialGradient></defs>
        </svg>`,
      4: `
        <svg class="svg-illustration" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="150" fill="url(#glow4)" opacity="0.3"/>
            <path d="M 120 220 L 140 160 L 170 190 L 200 140 L 230 190 L 260 160 L 280 220 Z" fill="#10b981" opacity="0.3" stroke="#10b981" stroke-width="3"/>
            <rect x="120" y="220" width="160" height="30" rx="5" fill="#10b981"/>
            <circle cx="140" cy="160" r="8" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
            <circle cx="200" cy="140" r="10" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
            <circle cx="260" cy="160" r="8" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
            <circle cx="140" cy="160" r="4" fill="#10b981"/>
            <circle cx="200" cy="140" r="5" fill="#10b981"/>
            <circle cx="260" cy="160" r="4" fill="#10b981"/>
            <ellipse cx="200" cy="280" rx="70" ry="60" fill="none" stroke="#10b981" stroke-width="3"/>
            <path d="M 150 260 Q 160 250, 170 260" stroke="#10b981" stroke-width="2" fill="none"/>
            <path d="M 170 270 Q 180 260, 190 270" stroke="#10b981" stroke-width="2" fill="none"/>
            <path d="M 190 280 Q 200 270, 210 280" stroke="#10b981" stroke-width="2" fill="none"/>
            <path d="M 210 270 Q 220 260, 230 270" stroke="#10b981" stroke-width="2" fill="none"/>
            <path d="M 230 260 Q 240 250, 250 260" stroke="#10b981" stroke-width="2" fill="none"/>
            <line x1="140" y1="168" x2="160" y2="250" stroke="#10b981" stroke-width="1.5" opacity="0.3"/>
            <line x1="200" y1="150" x2="200" y2="220" stroke="#10b981" stroke-width="1.5" opacity="0.3"/>
            <line x1="260" y1="168" x2="240" y2="250" stroke="#10b981" stroke-width="1.5" opacity="0.3"/>
            <circle cx="100" cy="200" r="4" fill="#10b981" opacity="0.6"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></circle>
            <circle cx="300" cy="200" r="4" fill="#10b981" opacity="0.6"><animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite"/></circle>
            <circle cx="150" cy="150" r="3" fill="#ffffff" opacity="0.5"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.2s" repeatCount="indefinite"/></circle>
            <circle cx="250" cy="150" r="3" fill="#ffffff" opacity="0.5"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.8s" repeatCount="indefinite"/></circle>
            <defs><radialGradient id="glow4"><stop offset="0%" stop-color="#10b981" stop-opacity="0.5"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/></radialGradient></defs>
        </svg>`,
      5: `
        <svg class="svg-illustration" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="140" stroke="#10b981" stroke-width="2" opacity="0.3">
                <animate attributeName="r" values="140;150;140" dur="3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="200" cy="200" r="120" stroke="#10b981" stroke-width="2" opacity="0.4">
                <animate attributeName="r" values="120;130;120" dur="2.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="200" cy="200" r="100" stroke="#10b981" stroke-width="3" opacity="0.5">
                <animate attributeName="r" values="100;110;100" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0.6;0.4" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="200" cy="200" r="60" fill="url(#powerGlow)" stroke="#10b981" stroke-width="4"/>
            <path d="M 160 200 C 160 180, 180 180, 200 200 C 220 220, 240 220, 240 200 C 240 180, 220 180, 200 200 C 180 220, 160 220, 160 200" stroke="#ffffff" stroke-width="3" fill="none"/>
            <path d="M 200 140 L 195 170 L 205 165 L 200 190" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <path d="M 260 200 L 230 195 L 235 205 L 210 200" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <path d="M 200 260 L 205 230 L 195 235 L 200 210" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <path d="M 140 200 L 170 205 L 165 195 L 190 200" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
            <path d="M 245 155 L 225 175 L 235 175 L 215 195" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
            <path d="M 245 245 L 225 225 L 235 225 L 215 205" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
            <path d="M 155 245 L 175 225 L 165 225 L 185 205" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
            <path d="M 155 155 L 175 175 L 165 175 L 185 195" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
            <circle cx="200" cy="100" r="8" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/></circle>
            <circle cx="280" cy="140" r="6" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite"/></circle>
            <circle cx="300" cy="200" r="8" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.9s" repeatCount="indefinite"/></circle>
            <circle cx="280" cy="260" r="6" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.1s" repeatCount="indefinite"/></circle>
            <circle cx="200" cy="300" r="8" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite"/></circle>
            <circle cx="120" cy="260" r="6" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite"/></circle>
            <circle cx="100" cy="200" r="8" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle>
            <circle cx="120" cy="140" r="6" fill="#10b981"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite"/></circle>
            <defs><radialGradient id="powerGlow"><stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/><stop offset="50%" stop-color="#10b981" stop-opacity="0.4"/><stop offset="100%" stop-color="#0a0a0a" stop-opacity="0"/></radialGradient></defs>
        </svg>`,
      6: `
        <svg class="svg-illustration" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 100 320 L 150 250 L 180 280 L 200 160 L 220 280 L 250 250 L 300 320 Z" fill="url(#titanGrad)" stroke="#10b981" stroke-width="3"/>
            <path d="M 180 280 L 200 160 L 220 280" fill="#10b981" opacity="0.8"/>
            <circle cx="200" cy="140" r="40" stroke="#10b981" stroke-width="2" opacity="0.6"/>
            <circle cx="200" cy="140" r="30" stroke="#10b981" stroke-width="1.5" opacity="0.5"/>
            <circle cx="200" cy="140" r="20" stroke="#10b981" stroke-width="2"/>
            <circle cx="200" cy="140" r="12" fill="#10b981"><animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/></circle>
            <circle cx="200" cy="140" r="6" fill="#ffffff"/>
            <path d="M 200 100 L 235 120 L 235 160 L 200 180 L 165 160 L 165 120 Z" stroke="#10b981" stroke-width="2" fill="none" opacity="0.4"/>
            <line x1="200" y1="140" x2="200" y2="80" stroke="#10b981" stroke-width="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></line>
            <line x1="200" y1="140" x2="260" y2="100" stroke="#10b981" stroke-width="2" opacity="0.7"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.3s" repeatCount="indefinite"/></line>
            <line x1="200" y1="140" x2="280" y2="160" stroke="#10b981" stroke-width="2" opacity="0.6"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite"/></line>
            <line x1="200" y1="140" x2="140" y2="100" stroke="#10b981" stroke-width="2" opacity="0.7"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.7s" repeatCount="indefinite"/></line>
            <line x1="200" y1="140" x2="120" y2="160" stroke="#10b981" stroke-width="2" opacity="0.6"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.9s" repeatCount="indefinite"/></line>
            <circle cx="200" cy="80" r="6" fill="#10b981"/>
            <circle cx="260" cy="100" r="5" fill="#10b981"/>
            <circle cx="280" cy="160" r="5" fill="#10b981"/>
            <circle cx="140" cy="100" r="5" fill="#10b981"/>
            <circle cx="120" cy="160" r="5" fill="#10b981"/>
            <circle cx="150" cy="250" r="6" fill="#10b981" opacity="0.8"/>
            <circle cx="180" cy="280" r="6" fill="#10b981" opacity="0.8"/>
            <circle cx="220" cy="280" r="6" fill="#10b981" opacity="0.8"/>
            <circle cx="250" cy="250" r="6" fill="#10b981" opacity="0.8"/>
            <circle cx="160" cy="270" r="2" fill="#ffffff" opacity="0.6"><animate attributeName="cy" values="270;140;270" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="4s" repeatCount="indefinite"/></circle>
            <circle cx="190" cy="290" r="2" fill="#ffffff" opacity="0.6"><animate attributeName="cy" values="290;140;290" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="5s" repeatCount="indefinite"/></circle>
            <circle cx="210" cy="290" r="2" fill="#ffffff" opacity="0.6"><animate attributeName="cy" values="290;140;290" dur="4.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="4.5s" repeatCount="indefinite"/></circle>
            <circle cx="240" cy="270" r="2" fill="#ffffff" opacity="0.6"><animate attributeName="cy" values="270;140;270" dur="5.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="5.5s" repeatCount="indefinite"/></circle>
            <path d="M 190 75 L 195 65 L 200 70 L 205 65 L 210 75" stroke="#10b981" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="200" cy="65" r="3" fill="#10b981"/>
            <defs><linearGradient id="titanGrad" x1="200" y1="160" x2="200" y2="320" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#10b981" stop-opacity="0.6"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.1"/></linearGradient></defs>
        </svg>`,
    };
    return (
      illustrations[id] ||
      '<img src="https://via.placeholder.com/300x200?text=Product" alt="Product">'
    );
  }
  function initProductsEventListeners() {
    const productsGrid = scope.document.getElementById("productsGrid");
    if (!productsGrid) return;
    scope.listen(productsGrid, "click", (e) => {
      const btnElement = e.target.closest(".buy-btn");
      if (!btnElement) return;
      const productId = parseInt(btnElement.getAttribute("data-id"), 10);
      if (isNaN(productId)) return;
      const product = products.find((p) => p.id === productId);
      if (product && typeof openCheckout === "function") {
        openCheckout(product);
      }
    });
  }
  function loadProducts() {
    const productsGrid = scope.document.getElementById("productsGrid");
    if (!productsGrid) return;
    if (
      !scope.window.AppI18n ||
      !scope.window.AppI18n.translations ||
      !scope.window.AppI18n.translations.products_data
    ) {
      console.warn("Localization data not fully loaded yet.");
      return;
    }
    const translations = scope.window.AppI18n.translations.products_data;
    const fragment = scope.document.createDocumentFragment();
    products.forEach((product) => {
      const productTrans = translations[product.id.toString()];
      if (!productTrans) return;
      const featuresHtml = productTrans.features
        .map(
          (feature) => `
            <li><span class="feature-icon">${SVG_ICONS.check}</span>${feature}</li>
        `,
        )
        .join("");
      const illustrationHtml = getSvgIllustration(product.id);
      const productCard = scope.document.createElement("div");
      productCard.className = "product-card glass";
      productCard.innerHTML = scope.sanitizeHtml(`
            <div class="product-image">
                ${illustrationHtml}
            </div>
            <div class="product-info">
                <h3 class="product-name">${productTrans.name}</h3>
                <div class="product-price">${product.price}</div>
                <ul class="product-features">
                    <li><span class="feature-icon icon-bolt">${SVG_ICONS.bolt}</span>${productTrans.credits_label || productTrans.credits || ""}</li>
                    ${featuresHtml}
                </ul>
                <button class="buy-btn" data-id="${product.id}">
                    ${translations.buy_now} 
                </button>
            </div>`);
      fragment.appendChild(productCard);
    });
    productsGrid.innerHTML = scope.sanitizeHtml("");
    productsGrid.appendChild(fragment);
  }
  function updateUserUI(user) {
    if (navUsername) navUsername.textContent = user.name || user.email;
    if (user.avatar) {
      if (navIcon) navIcon.style.display = "none";
      if (navAvatar) {
        navAvatar.style.display = "block";
        navAvatar.src = user.avatar;
        navAvatar.alt = "User Avatar";
      }
      dropdownAvatars.forEach((img) => {
        img.src = user.avatar;
        img.alt = "User Avatar";
      });
    } else {
      dropdownAvatars.forEach((img) => {
        img.src =
          "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
          (user.name || "User");
        img.alt = "Default User Avatar";
      });
    }
    if (menuName) menuName.textContent = user.name || "User";
    if (menuEmail) menuEmail.textContent = user.email;
    if (menuCredits)
      menuCredits.textContent = (user.credits || 0).toLocaleString();
    scope.document.dispatchEvent(new Event("genyxo:session"));
  }
  async function handleLoginSubmit(e) {
    e.preventDefault();
    stopPolling();
    const form = e.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    try {
      const response = await scope.fetch(API_BASE_URL + "/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: scope.document.getElementById("loginEmail").value,
          password: scope.document.getElementById("loginPassword").value,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(String(data.message || "Invalid email or password"), "error");
        return;
      }
      if (!data.access_token || !data.user)
        throw new Error("Invalid login response");
      applyAuthenticatedUser(data);
      closeLoginModal();
      showToast("Welcome back!", "success");
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally {
      button.disabled = false;
    }
  }
  async function handleSignupSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;
    const name = scope.document.getElementById("signupName").value;
    const email = scope.document.getElementById("signupEmail").value;
    const password = scope.document.getElementById("signupPassword").value;
    if (
      password !== scope.document.getElementById("signupConfirmPassword").value
    ) {
      showToast("Passwords do not match", "error");
      return;
    }
    button.disabled = true;
    try {
      const response = await scope.fetch(API_BASE_URL + "/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: localStorage.getItem("pending_referral_code") || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(String(data.message || "Registration failed"), "error");
        return;
      }
      if (data.access_token && data.user) {
        applyAuthenticatedUser(data);
        closeLoginModal();
        return;
      }
      closeLoginModal();
      const verify = scope.document.getElementById("verifyEmailModal");
      if (verify) {
        verify.style.display = "flex";
        startPolling(email, password);
      }
      showToast("Registration successful! Please check your email.", "success");
    } catch {
      showToast("Server error during registration", "error");
    } finally {
      button.disabled = false;
    }
  }
  function handleLoginButtonClick(e) {
    e.stopPropagation();
    if (token) {
      profilePanel.classList.toggle("show");
    } else {
      openLoginModal();
    }
  }
  function updateLoginButton(name, token) {
    const navUsername = scope.document.getElementById("navUsername");
    const navIcon = scope.document.getElementById("navIcon");
    const navAvatar = scope.document.getElementById("navAvatar");
    const profilePanel = scope.document.getElementById("profilePanel");
    const loginBtn = scope.document.getElementById("loginBtn");
    if (token) {
      if (navUsername) navUsername.textContent = name;
      if (navIcon) navIcon.style.display = "none";
      if (navAvatar) navAvatar.style.display = "block";
      if (loginBtn) {
        loginBtn.classList.remove("login-btn");
        loginBtn.classList.add("profile-toggle-btn");
      }
    } else {
      if (navUsername) navUsername.textContent = "Register / Login";
      if (navIcon) navIcon.style.display = "inline-block";
      if (navAvatar) navAvatar.style.display = "none";
      if (loginBtn) {
        loginBtn.classList.remove("profile-toggle-btn");
        loginBtn.classList.add("login-btn");
      }
      if (profilePanel) profilePanel.classList.remove("show");
    }
  }
  function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    if (!scope.window.i18n || !scope.window.i18n.translations) return;
    const translations = i18n.translations.products_data || {};
    const filteredProducts = products.filter((product) => {
      const productTrans = translations[product.id.toString()];
      return (
        productTrans && productTrans.name.toLowerCase().includes(searchTerm)
      );
    });
    productsGrid.innerHTML = scope.sanitizeHtml("");
    if (filteredProducts.length === 0) {
      productsGrid.innerHTML = scope.sanitizeHtml(
        `<div class="glass" style="grid-column: 1/-1; padding: 2rem; text-align: center;">No products found</div>`,
      );
      return;
    }
    filteredProducts.forEach((product) => {
      const productTrans = translations[product.id.toString()];
      const featuresHtml = productTrans.features
        .map((f) => `<li><i class="fas fa-check"></i> ${f}</li>`)
        .join("");
      const card = scope.document.createElement("div");
      card.className = "product-card glass";
      card.innerHTML = scope.sanitizeHtml(`
            <div class="product-image"><img src="${product.image}" alt="${productTrans.name}"></div>
            <div class="product-info">
                <h3>${productTrans.name}</h3>
                <div class="product-price">${product.price}</div>
                <ul class="product-features">${featuresHtml}</ul>
                <button class="buy-btn" data-id="${product.id}">${translations.buy_now}</button>
            </div>
        `);
      productsGrid.appendChild(card);
    });
    scope.document.querySelectorAll(".buy-btn").forEach((btn) => {
      scope.listen(btn, "click", (e) => {
        const productId = parseInt(
          e.target.closest(".buy-btn").getAttribute("data-id"),
        );
        const product = products.find((p) => p.id === productId);
        openCheckout(product);
      });
    });
  }
  function toggleProfilePanel() {
    const profilePanel = scope.document.getElementById("profilePanel");
    if (profilePanel) {
      profilePanel.classList.toggle("show");
    }
  }
  function stopPolling() {
    verificationGeneration++;
    verificationRequest?.abort();
    verificationRequest = null;
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }
  function startPolling(email, password) {
    stopPolling();
    const generation = verificationGeneration;
    let pending = false;
    pollingInterval = scope.setInterval(async () => {
      if (pending || generation !== verificationGeneration) return;
      pending = true;
      const request = new AbortController();
      verificationRequest = request;
      try {
        const response = await scope.fetch(API_BASE_URL + "/auth/login", {
          signal: request.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (generation !== verificationGeneration || request.signal.aborted)
          return;
        if (!data.access_token || !data.user) return;
        stopPolling();
        applyAuthenticatedUser(data);
        const verify = scope.document.getElementById("verifyEmailModal");
        if (verify) verify.style.display = "none";
        showToast("Email verified! Welcome!", "success");
      } catch {
      } finally {
        pending = false;
        if (verificationRequest === request) verificationRequest = null;
      }
    }, 7000);
  }
  function setupEventListeners() {
    if (loginBtn) {
      scope.listen(loginBtn, "click", (e) => {
        e.stopPropagation();
        if (loginBtn.classList.contains("profile-toggle-btn")) {
          toggleProfilePanel();
        } else {
          openLoginModal();
        }
      });
    }
    if (closeProfilePanelBtn) {
      scope.listen(closeProfilePanelBtn, "click", (e) => {
        e.stopPropagation();
        if (profilePanel) profilePanel.classList.remove("show");
      });
    }
    if (closeLogin) {
      scope.listen(closeLogin, "click", closeLoginModal);
    }
    if (dropdownLogoutBtn) {
      scope.listen(dropdownLogoutBtn, "click", handleLogout);
    }
    if (closeCheckoutBtn) {
      scope.listen(closeCheckoutBtn, "click", () => {
        checkoutModal.style.display = "none";
        scope.document.body.style.overflow = "auto";
        payBtn.classList.remove("loading");
        payBtn.disabled = false;
      });
    }
    const loginForm = scope.document.getElementById("loginForm");
    if (loginForm) {
      scope.listen(loginForm, "submit", handleLoginSubmit);
    }
    const signupForm = scope.document.getElementById("signupForm");
    if (signupForm) {
      scope.listen(signupForm, "submit", handleSignupSubmit);
    }
    if (showSignup) {
      scope.listen(showSignup, "click", (e) => {
        e.preventDefault();
        showSignupForm();
      });
    }
    if (showLogin) {
      scope.listen(showLogin, "click", (e) => {
        e.preventDefault();
        showLoginForm();
      });
    }
    if (searchInput) {
      scope.listen(searchInput, "input", handleSearch);
    }
    if (exploreBtn) {
      scope.listen(exploreBtn, "click", () => {
        const products = scope.document.getElementById("products");
        if (products)
          products.scrollIntoView({
            behavior: "smooth",
          });
      });
    }
    scope.window.addEventListener("click", (e) => {
      if (
        !e.target.closest(".profile-container") &&
        profilePanel.classList.contains("show")
      ) {
        profilePanel.classList.remove("show");
      }
      if (e.target === checkoutModal) {
        checkoutModal.style.display = "none";
        scope.document.body.style.overflow = "auto";
      }
    });
  }
  const avatarBtn = scope.document.getElementById("profileToggleBtn");
  if (avatarBtn) {
    scope.listen(avatarBtn, "click", (e) => {
      e.stopPropagation();
      toggleProfilePanel();
    });
  }
  function setupNavigation() {
    navLinks.forEach((link) => {
      scope.listen(link, "click", (e) => {
        const href = link.getAttribute("href");
        if (href.startsWith("#")) {
          e.preventDefault();
          scope.document.getElementById(href.substring(1)).scrollIntoView({
            behavior: "smooth",
          });
        }
      });
    });
  }
  function setupBurgerMenu() {
    const burger = scope.document.getElementById("burger");
    const mobileMenu = scope.document.getElementById("mobileMenu");
    const overlay = scope.document.getElementById("menuOverlay");
    if (!burger || !mobileMenu || !overlay) return;
    function closeMenu() {
      burger.classList.remove("active");
      mobileMenu.classList.remove("active");
      overlay.classList.remove("active");
    }
    scope.listen(burger, "click", () => {
      burger.classList.toggle("active");
      mobileMenu.classList.toggle("active");
      overlay.classList.toggle("active");
    });
    scope.document.querySelectorAll(".mobile-menu a").forEach((link) => {
      scope.listen(link, "click", closeMenu);
    });
    scope.listen(overlay, "click", closeMenu);
  }
  const copyAffBtn = scope.document.getElementById("copyAffBtn");
  if (copyAffBtn) {
    scope.listen(copyAffBtn, "click", () => {
      if (affLink && affLink.value) {
        affLink.select();
        affLink.setSelectionRange(0, 99999);
        navigator.clipboard
          .writeText(affLink.value)
          .then(() => {
            showToast("Referral link copied!", "success");
          })
          .catch((err) => {
            console.error("Copy failed", err);
            scope.document.execCommand("copy");
            showToast("Link copied!", "success");
          });
      }
    });
  }
  function requestPayout() {
    const affBalance = parseFloat(
      scope.document.getElementById("affiliateBalance").innerText,
    );
    if (!affBalance) return;
    if (affBalance < 10) {
      showToast("Minimum withdrawal amount is $10.00", "error");
      return;
    }
    if (
      confirm(
        `Request payout of $${affBalance}? Support will contact you via email.`,
      )
    ) {
      showToast("Request sent! Support will contact you shortly.", "success");
    }
  }

  /* async function loadTransactionHistory(page = 1) {
    const tbody = document.getElementById('transactions-body');
    const paginationContainer = document.getElementById('pagination-controls');
    
    // Сеньйор-деталь: показуємо завантаження
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Завантаження історії...</td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/profile/transactions?page=${page}&limit=5`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await res.json();
        
        // 1. ПЕРЕВІРКА ТУТ: якщо транзакцій немає
        if (!data.items || data.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 60px; color: var(--text-gray);">
                        <i class="fas fa-receipt" style="font-size: 3rem; display: block; margin-bottom: 15px; opacity: 0.3;"></i>
                        У вас поки немає транзакцій.
                    </td>
                </tr>`;
            paginationContainer.innerHTML = ''; // Прибираємо пагінацію, якщо пусто
            return;
        }

        // 2. Якщо дані є, малюємо таблицю
        tbody.innerHTML = data.items.map(tx => `
            <tr>
                <td><span style="opacity: 0.5; font-size: 0.8rem;">#</span>${tx.id}</td>
                <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
                <td><b style="color: var(--accent);">+${tx.creditsAmount}</b></td>
                <td>$${tx.amount}</td>
                <td><span class="status-badge status-${tx.status.toLowerCase()}">${tx.status}</span></td>
            </tr>
        `).join('');

        renderPagination(data.meta);
    } catch (err) {
        console.error("History load error:", err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #ff4d4d;">Помилка завантаження даних</td></tr>';
    }
} */

  async function loadTransactionHistory(page = 1) {
    const tbody = scope.document.getElementById("transactions-body");
    if (!tbody) return;
    try {
      const response = await scope.fetch(
        `${API_BASE_URL}/profile/transactions?page=${page}&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      tbody.innerHTML = scope.sanitizeHtml(
        data.items
          .map(
            (tx) => `
            <tr>
                <td>${new Date(tx.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}</td>
                <td>$${tx.amount}</td>
                <td>
                    <span class="status-badge status-${tx.status.toLowerCase()}">
                        ${tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                    </span>
                </td>
                <td>
                    <a href="#" class="receipt-link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        Details
                    </a>
                </td>
            </tr>
        `,
          )
          .join(""),
      );
      renderPagination(Math.ceil(data.total / 5), page);
    } catch (err) {
      console.error("Failed to load transactions", err);
    }
  }
  function renderPagination(meta) {
    const container = scope.document.getElementById("pagination-controls");
    let html = "";
    for (let i = 1; i <= meta.totalPages; i++) {
      html += `<button class="${i === meta.currentPage ? "active" : ""}" data-gx-click="${scope.bindHandler(
        function (event) {
          loadTransactionHistory(i);
        },
      )}">${i}</button>`;
    }
    container.innerHTML = scope.sanitizeHtml(html);
  }
  async function purchasePack(packId) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = scope.sanitizeHtml(
      '<i class="fas fa-spinner fa-spin"></i> Processing...',
    );
    try {
      const res = await scope.fetch(`${API_BASE_URL}/payment/buy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId,
        }),
      });
      const result = await res.json();
      if (result.url) {
        scope.window.location.href = result.url;
      } else {
        showToast("Something went wrong", "error");
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerText = "Get Credits";
      showToast("Payment initialization failed", "error");
    }
  }
  const CONFIG = {
    POLLING_INTERVAL: 60000,
    ANIMATION_THRESHOLD: 0.1,
    MODAL_CLASS: "modal",
  };
  function initScrollAnimations() {
    const observer = scope.createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-active");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: CONFIG.ANIMATION_THRESHOLD,
        rootMargin: "0px 0px -50px 0px",
      },
    );
    scope.document
      .querySelectorAll(".animate-on-scroll")
      .forEach((el) => observer.observe(el));
  }
  function handleBillingUpdate() {
    loadTransactionHistory(1);
    const credits = localStorage.getItem("userCredits") || "0";
    const display = scope.document.getElementById("display-credits");
    if (display) display.innerText = credits;
  }
  function setupTabs() {
    const container = scope.document.querySelector(".tabs-nav-container");
    if (!container) return;
    scope.listen(container, "click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const targetId = btn.dataset.tab;
      if (!targetId) return;
      scope.document
        .querySelectorAll(".tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      scope.document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      const targetContent = scope.document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add("active");
        if (targetId === "billing-section") handleBillingUpdate();
      }
    });
  }
  const FAQManager = {
    els: {},
    init() {
      this.els = {
        window: scope.document.getElementById("faqWindow"),
        menu: scope.document.getElementById("faqMenu"),
        backBtn: scope.document.getElementById("faqBackBtn"),
        closeBtn: scope.document.getElementById("faqCloseBtn"),
        pages: scope.document.querySelectorAll(".faq-content-page"),
        openBtns: scope.document.querySelectorAll("#openFaqBtn"),
        body: scope.document.querySelector(".faq-body"),
      };
      if (!this.els.window) return;
      this.bindEvents();
    },
    reset() {
      this.els.pages.forEach((p) => p.classList.remove("active"));
    },
    openPage(pageId) {
      if (this.els.menu) this.els.menu.style.display = "none";
      this.reset();
      scope.document.getElementById(pageId)?.classList.add("active");
      if (this.els.backBtn) this.els.backBtn.style.visibility = "visible";
      this.els.body?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    goBack() {
      this.reset();
      if (this.els.menu) this.els.menu.style.display = "block";
      if (this.els.backBtn) this.els.backBtn.style.visibility = "hidden";
    },
    bindEvents() {
      this.els.backBtn?.addEventListener("click", () => this.goBack());
      this.els.openBtns.forEach((btn) => {
        scope.listen(btn, "click", (e) => {
          e.stopPropagation();
          this.els.window.classList.add("active");
          this.goBack();
        });
      });
      this.els.closeBtn?.addEventListener("click", () => {
        this.els.window.classList.remove("active");
        scope.setTimeout(() => this.goBack(), 300);
      });
    },
  };
  function setupGlobalClickHandlers() {
    scope.window.addEventListener("click", (event) => {
      if (event.target.classList.contains(CONFIG.MODAL_CLASS)) {
        event.target.style.display = "none";
        if (event.target.id === "verifyEmailModal") stopPolling();
      }
    });
  }
  scope.setInterval(updateNotificationsBadge, 60000);

  // --- INITIALIZATION ---
  async function init() {
    const urlParams = new URLSearchParams(scope.window.location.search);
    let activeToken =
      urlParams.get("token") || localStorage.getItem("authToken");
    scope.window.token = activeToken;
    currentUserName = localStorage.getItem("userName") || "User";
    currentUserAvatar = localStorage.getItem("userAvatar");
    currentUserEmail = localStorage.getItem("userEmail");
    if (activeToken) {
      updateUIState(true, {
        name: currentUserName,
        email: currentUserEmail,
        avatar: currentUserAvatar,
      });
    } else {
      updateUIState(false);
    }
    setupGlobalClickHandlers();
    setupEventListeners();
    setupNavigation();
    setupBurgerMenu();
    setupTabs();
    FAQManager.init();
    initScrollAnimations();
    if (urlParams.has("token")) {
      localStorage.setItem("authToken", activeToken);
      scope.window.history.replaceState({}, scope.document.title, "/");
      await fetchUserProfile(activeToken);
      updateUIState(true, {
        name: localStorage.getItem("userName"),
        email: localStorage.getItem("userEmail"),
        avatar: localStorage.getItem("userAvatar"),
      });
    }
    updateLoginButton(currentUserName, activeToken);
    updateAdminDashboardVisibility();
    checkPaymentStatus();
    if (activeToken) {
      fetchUserData();
      initGlobalSockets();
      updateNotificationsBadge();
    }
    if (!activeToken && scope.window.location.hash === "#login") {
      openLoginModal();
    }
    scope.window.openFaqPage = (id) => FAQManager.openPage(id);
    loadProfileData();
  }

  // Бази даних для пошуку та відображення
  const aiModelsData = [
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      company: "Google",
      creator: "Google",
      icon: "./images/google-gemini.svg",
      desc: "Google's most powerful model for complex logical tasks, coding, and analyzing large texts.",
    },
    {
      id: "gemini-flash",
      name: "Gemini Flash",
      company: "Google",
      creator: "Google",
      icon: "./images/google-gemini.svg",
      desc: "A lightweight and lightning-fast model. Perfect for everyday tasks.",
    },
    {
      id: "gemini-flash-lite",
      name: "Gemini Flash-Lite",
      company: "Google",
      creator: "Google",
      icon: "./images/google-gemini.svg",
      desc: "Google's fastest model. Perfect for quick answers.",
    },
    {
      id: "gpt-5.1",
      name: "ChatGPT-5.1",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "a highly efficient AI model by OpenAI that introduces adaptive reasoning, allowing it to dynamically shift between a fast, lightweight chat mode and a deep, stepwise thinking mode",
    },
    {
      id: "gpt-5",
      name: "ChatGPT-5",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "OpenAI's flagship multimodal AI model family, featuring advanced deep reasoning, significantly reduced hallucination rates, and native integration for text, images, and audio.",
    },
    {
      id: "gpt-5-mini",
      name: "ChatGPT-5 Mini",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "OpenAI's lightweight, efficiency-focused AI model. It is designed to deliver high-speed text and image processing, tool use, and strong coding capabilities at a fraction of the cost and latency of flagship models, making it ideal for high-volume tasks and multi-agent workflows.",
    },
    {
      id: "gpt-4.1",
      name: "ChatGPT-4.1",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "high-speed, cost-effective AI model family by OpenAI. The series includes the flagship model, a low-latency Mini, and an exceptionally cheap Nano.",
    },
    {
      id: "gpt-4-mini",
      name: "ChatGPT-4 Mini",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "OpenAI’s fastest, most cost-effective small AI model. Designed for high-volume, low-latency tasks, it combines advanced textual intelligence and multimodal reasoning (text + image input) with massive affordability, making it ideal for apps, chatbots, and focused workflows.",
    },
    {
      id: "gpt-o1",
      name: "ChatGPT-o1",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "a cutting-edge AI model by OpenAI with exceptional reasoning capabilities.",
    },
    {
      id: "gpt-o3-reasoning",
      name: "ChatGPT-o3 Reasoning",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "a highly advanced AI model by OpenAI designed for complex reasoning tasks.",
    },
    {
      id: "gpt-4o",
      name: "ChatGPT-4o",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/chatgpt-icon.svg",
      desc: "the latest flagship AI model by OpenAI with enhanced multimodal capabilities.",
    },
    {
      id: "claude-sonnet-4.6",
      name: "Claude Sonnet 4.6",
      company: "Anthropic",
      creator: "Anthropic",
      icon: "./images/claude-ai.svg",
      desc: "the latest flagship AI model by Anthropic with improved reasoning and safety features.",
    },
    {
      id: "claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      company: "Anthropic",
      creator: "Anthropic",
      icon: "./images/claude-ai.svg",
      desc: "a highly capable AI model by Anthropic designed for complex tasks.",
    },
    {
      id: "claude-opus-4.6",
      name: "Claude Opus 4.6",
      company: "Anthropic",
      creator: "Anthropic",
      icon: "./images/claude-ai.svg",
      desc: "highly advanced, agentic reasoning model released by Anthropic. It is celebrated for its industry-leading capabilities in complex knowledge work, deep research, and multi-step tasks.",
    },
    {
      id: "claude-opus-4.5",
      name: "Claude Opus 4.5",
      company: "Anthropic",
      creator: "Anthropic",
      icon: "./images/claude-ai.svg",
      desc: "Anthropic's flagship frontier AI model designed for complex reasoning, long-horizon agent workflows, and professional software engineering.",
    },
    {
      id: "claude-haiku-4.5",
      name: "Claude Haiku 4.5",
      company: "Anthropic",
      creator: "Anthropic",
      icon: "./images/claude-ai.svg",
      desc: "Anthropic's flagship compact AI model. Designed for extreme speed and cost-efficiency, it matches the coding and reasoning capabilities of previous heavyweight models (like Sonnet 4) at a fraction of the cost.",
    },
    {
      id: "claude-haiku-3",
      name: "Claude Haiku 3",
      company: "Anthropic",
      creator: "Anthropic",
      icon: "./images/claude-ai.svg",
      desc: "Anthropic's fastest and most compact AI model. It is specifically designed for ultra-low-latency, high-volume, and cost-efficient tasks like batch processing, rapid text summarization, and responsive customer support.",
    },
    {
      id: "dall-e-image",
      name: "DALL-E Image",
      company: "OpenAI",
      creator: "OpenAI",
      icon: "./images/dalle-text.png",
      desc: "A model for creating images based on text descriptions.",
    },
    {
      id: "kling-video",
      name: "Kling Video",
      company: "Kuaishou Technology",
      creator: "Kuaishou Technology",
      icon: "./images/kling-video.svg",
      desc: "the latest flagship AI model by Kuaishou Technology with enhanced multimodal capabilities.",
    },
    {
      id: "arcee",
      name: "Arcee",
      company: "Arcee",
      creator: "Arcee",
      icon: "./images/arcee-ai.svg",
      desc: "the latest flagship AI model by Arcee with enhanced multimodal capabilities.",
    },
  ];
  const quickActionsData = [
    {
      id: "password",
      name: "Change Password",
      icon: "fas fa-lock",
      url: "profile.html#page-password",
    },
    {
      id: "billing",
      name: "Payment History",
      icon: "fas fa-receipt",
      url: "profile.html#billing",
    },
    {
      id: "support",
      name: "Support",
      icon: "fas fa-headset",
      url: "support.html",
    },
    {
      id: "chat",
      name: "Open Chat",
      icon: "fas fa-comments",
      url: "chat.html",
    },
    {
      id: "affiliate",
      name: "Affiliate",
      icon: "fas fa-user-friends",
      url: "profile.html#page-affiliate",
    },
    {
      id: "transactions",
      name: "Transactions",
      icon: "fas fa-exchange-alt",
      url: "profile.html#page-transactions",
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: "fas fa-bell",
      url: "notifications.html",
    },
    {
      id: "faq",
      name: "FAQ",
      icon: "fas fa-question-circle",
      url: "./policies/faq.html",
    },
    {
      id: "policies",
      name: "Policies",
      icon: "fas fa-file-alt",
      url: "./policies/policies.html",
    },
    {
      id: "privacy-policy",
      name: "Privacy Policy",
      icon: "fas fa-shield-alt",
      url: "./policies/privacy-policy.html",
    },
    {
      id: "terms-of-service",
      name: "Terms of Service",
      icon: "fas fa-file-contract",
      url: "./policies/terms-of-service.html",
    },
  ];
  function isImageIcon(icon) {
    return /\.(svg|png|jpe?g|webp)$/i.test(icon || "");
  }
  function renderAiModelIcon(icon, alt, size = 24) {
    if (isImageIcon(icon)) {
      return `<img src="${icon}" alt="${alt || "AI model"}" style="width: ${size}px; height: ${size}px; object-fit: contain;" data-gx-error="${scope.bindHandler(
        function (event) {
          this.replaceWith(
            Object.assign(scope.document.createElement("i"), {
              className: "fas fa-bolt",
            }),
          );
        },
      )}">`;
    }
    return `<i class="${icon || "fas fa-bolt"}" style="color: #10e6cc;"></i>`;
  }

  // Ініціалізація пошуку та дефолтного стану після завантаження DOM
  scope.document.addEventListener("DOMContentLoaded", () => {
    const searchInput = scope.document.querySelector(".search-input");
    const dropdown = scope.document.getElementById("searchResultsDropdown");
    const defaultState = scope.document.getElementById("searchDefaultState");
    const resultsState = scope.document.getElementById("searchResultsState");
    const defaultList = scope.document.getElementById("defaultSearchList");
    if (!searchInput || !dropdown) return;
    const renderDefaultPacks = () => {
      defaultList.innerHTML = scope.sanitizeHtml("");
      if (typeof products !== "undefined" && products.length > 0) {
        products.slice(0, 3).forEach((product) => {
          const item = scope.document.createElement("div");
          item.className = "search-result-item";
          item.innerHTML = scope.sanitizeHtml(`
                    <img src="${product.image}" alt="${product.alt}" class="search-result-img">
                    <div class="search-result-info">
                        <span class="search-result-name">${product.alt}</span>
                        <span class="search-result-price">${product.price}</span>
                    </div>
                `);
          item.onclick = () => {
            openCheckout(product);
            dropdown.classList.remove("show");
          };
          defaultList.appendChild(item);
        });
      }
    };
    renderDefaultPacks();
    scope.listen(searchInput, "focus", () => {
      dropdown.classList.add("show");
      if (searchInput.value.trim().length === 0) {
        defaultState.style.display = "flex";
        resultsState.style.display = "none";
      }
    });
    scope.document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        dropdown.classList.remove("show");
      }
    });
    scope.listen(searchInput, "input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        defaultState.style.display = "flex";
        resultsState.style.display = "none";
        return;
      }
      defaultState.style.display = "none";
      resultsState.style.display = "flex";
      resultsState.innerHTML = scope.sanitizeHtml("");
      const matchedProducts = (typeof products !== "undefined" ? products : [])
        .filter((p) => p.alt.toLowerCase().includes(query))
        .map((p) => ({
          ...p,
          type: "product",
        }));
      const matchedModels = aiModelsData
        .filter((m) => m.name.toLowerCase().includes(query))
        .map((m) => ({
          ...m,
          type: "model",
        }));
      const matchedActions = quickActionsData
        .filter((a) => a.name.toLowerCase().includes(query))
        .map((a) => ({
          ...a,
          type: "action",
        }));
      const allMatches = [
        ...matchedProducts,
        ...matchedModels,
        ...matchedActions,
      ].slice(0, 10);
      if (allMatches.length === 0) {
        resultsState.innerHTML = scope.sanitizeHtml(
          `<div class="search-no-results">Nothing found</div>`,
        );
        return;
      }
      allMatches.forEach((match) => {
        const item = scope.document.createElement("div");
        item.className = "search-result-item";
        if (match.type === "product") {
          item.innerHTML = scope.sanitizeHtml(`
                    <img src="${match.image}" class="search-result-img" alt="search-image">
                    <div class="search-result-info">
                        <span class="search-result-name">${match.alt}</span>
                        <span class="search-result-price" style="color: #2ecc71;">${match.price}</span>
                    </div>
                `);
          item.onclick = () => {
            openCheckout(match);
            dropdown.classList.remove("show");
            searchInput.value = "";
          };
        } else if (match.type === "model") {
          item.innerHTML = scope.sanitizeHtml(`
                    <div class="search-result-icon-box">
                        ${renderAiModelIcon(match.icon, match.name, 20)}
                    </div>
                    <div class="search-result-info">
                        <span class="search-result-name">${match.name}</span>
                        <span class="search-result-price">AI Model</span>
                    </div>
                `);
          item.onclick = () => {
            openAiModelModal(match);
            dropdown.classList.remove("show");
            searchInput.value = "";
          };
        } else if (match.type === "action") {
          item.innerHTML = scope.sanitizeHtml(`
                    <div class="search-result-icon-box"><i class="${match.icon}" style="color: #aaa;"></i></div>
                    <div class="search-result-info">
                        <span class="search-result-name">${match.name}</span>
                        <span class="search-result-price">Quick Action</span>
                    </div>
                `);
          item.onclick = () => {
            scope.window.location.href = match.url;
          };
        }
        resultsState.appendChild(item);
      });
    });
    initProductsEventListeners();
  });
  function openCategoryModal(type) {
    const modal = scope.document.getElementById("categoryModal");
    const title = scope.document.getElementById("categoryModalTitle");
    const desc = scope.document.getElementById("categoryModalDesc");
    const listContainer = scope.document.getElementById("categoryModalList");

    // Закриваємо випадаюче меню пошуку
    scope.document
      .getElementById("searchResultsDropdown")
      .classList.remove("show");
    listContainer.innerHTML = scope.sanitizeHtml("");
    if (type === "packs") {
      title.innerHTML = scope.sanitizeHtml(
        '<i class="fas fa-box" style="color: #10e6cc;"></i> Credit Packages',
      );
      desc.textContent = "Choose the loan package that best suits your needs.";
      if (typeof products !== "undefined") {
        products.forEach((p) => {
          listContainer.innerHTML += scope.sanitizeHtml(`
                    <div class="category-modal-item" data-gx-click="${scope.bindHandler(
                      function (event) {
                        openCheckout({
                          alt: `${p.alt}`,
                          price: `${p.price}`,
                          image: `${p.image}`,
                        });
                        scope.document.getElementById(
                          "categoryModal",
                        ).style.display = "none";
                      },
                    )}">
                        <div class="category-item-icon"><img src="${p.image}" alt="pack"></div>
                        <div>
                            <div style="color: #fff; font-weight: 500;">${p.alt}</div>
                            <div style="color: #2ecc71; font-size: 0.85rem;">${p.price}</div>
                        </div>
                    </div>
                `);
        });
      }
    } else if (type === "models") {
      title.innerHTML = scope.sanitizeHtml(
        '<i class="fas fa-robot" style="color: #10e6cc;"></i> AI Models',
      );
      desc.textContent =
        "Catalog of available neural networks for use on the platform.";
      aiModelsData.forEach((m) => {
        listContainer.innerHTML += scope.sanitizeHtml(`
                <div class="category-modal-item" data-gx-click="${scope.bindHandler(
                  function (event) {
                    scope.document.getElementById(
                      "categoryModal",
                    ).style.display = "none";
                    openAiModelModalById(`${m.id}`);
                  },
                )}">
                    <div class="category-item-icon">
                        ${renderAiModelIcon(m.icon, m.name, 24)}
                    </div>
                    <div>
                        <div style="color: #fff; font-weight: 500;">${m.name}</div>
                        <div style="color: #aaa; font-size: 0.85rem;">Developer: ${m.company}</div>
                    </div>
                </div>
            `);
      });
    } else if (type === "actions") {
      title.innerHTML = scope.sanitizeHtml(
        '<i class="fas fa-bolt" style="color: #10e6cc;"></i> Quick Actions',
      );
      desc.textContent = "Quick access to key account management sections.";
      quickActionsData.forEach((a) => {
        listContainer.innerHTML += scope.sanitizeHtml(`
                <div class="category-modal-item" data-gx-click="${scope.bindHandler(
                  function (event) {
                    scope.window.location.href = `${a.url}`;
                  },
                )}">
                    <div class="category-item-icon" style="color: #aaa;"><i class="${a.icon}"></i></div>
                    <div style="color: #fff; font-weight: 500;">${a.name}</div>
                </div>
            `);
      });
    }
    modal.style.display = "flex";
  }
  function openAiModelModalById(id) {
    const model = aiModelsData.find((m) => m.id === id);
    if (model) openAiModelModal(model);
  }
  function openAiModelModal(modelData) {
    const modal = scope.document.getElementById("aiModelModal");
    const iconEl = scope.document.getElementById("aiModelIcon");

    // Заполняем основные поля. Обрати внимание на формат Company
    scope.document.getElementById("aiModelTitle").textContent = modelData.name;
    scope.document.getElementById("aiModelCompany").textContent =
      `Company: "${modelData.company}"`;
    scope.document.getElementById("aiModelDesc").textContent = modelData.desc;
    iconEl.className = "";
    iconEl.removeAttribute("style");

    // Проверяем, является ли иконка путем к файлу или классом FontAwesome
    if (isImageIcon(modelData.icon)) {
      // Это картинка
      iconEl.innerHTML = scope.sanitizeHtml(
        renderAiModelIcon(modelData.icon, modelData.name, 48),
      );
    } else {
      // Это FontAwesome класс
      iconEl.innerHTML = scope.sanitizeHtml(
        `<i class="${modelData.icon} fa-4x" style="color: #10e6cc;"></i>`,
      );
    }

    // Кнопка выбора
    scope.document.getElementById("aiModelSelectBtn").onclick = () => {
      localStorage.setItem("selectedAIModel", modelData.id);
      modal.style.display = "none";
      scope.window.location.href = "chat.html";
    };

    // Берем заголовки колонок
    const th1 = scope.document.getElementById("compModel1");
    const th2 = scope.document.getElementById("compModel2");
    const th3 = scope.document.getElementById("compModel3");
    let comparisonData = [];

    // Генерируем данные в зависимости от компании модели
    if (modelData.company === "Google") {
      th1.textContent = "Flash-Lite";
      th2.textContent = "Flash";
      th3.textContent = "Pro";
      comparisonData = [
        {
          feature: "Generation speed",
          m1: true,
          m2: true,
          m3: false,
        },
        {
          feature: "Complex logical tasks",
          m1: false,
          m2: true,
          m3: true,
        },
        {
          feature: "Video processing",
          m1: false,
          m2: true,
          m3: true,
        },
        {
          feature: "Code generation",
          m1: false,
          m2: true,
          m3: true,
        },
      ];
    } else if (modelData.company === "OpenAI") {
      th1.textContent = "GPT-4o Mini";
      th2.textContent = "GPT-4o";
      th3.textContent = "o1-preview";
      comparisonData = [
        {
          feature: "Generation speed",
          m1: true,
          m2: false,
          m3: false,
        },
        {
          feature: "Mathematics / Logic",
          m1: false,
          m2: true,
          m3: true,
        },
        {
          feature: "Multimodality",
          m1: false,
          m2: true,
          m3: false,
        },
        {
          feature: "Code generation",
          m1: false,
          m2: true,
          m3: true,
        },
      ];
    } else {
      // Дефолт (например, для Anthropic / Claude)
      th1.textContent = "Haiku";
      th2.textContent = "Sonnet";
      th3.textContent = "Opus";
      comparisonData = [
        {
          feature: "Generation speed",
          m1: true,
          m2: false,
          m3: false,
        },
        {
          feature: "Mathematics / Logic",
          m1: false,
          m2: true,
          m3: true,
        },
        {
          feature: "Code analysis",
          m1: false,
          m2: true,
          m3: true,
        },
        {
          feature: "Text processing",
          m1: true,
          m2: true,
          m3: true,
        },
      ];
    }
    const tbody = scope.document.getElementById("aiComparisonBody");
    tbody.innerHTML = scope.sanitizeHtml("");

    // Рендерим строки
    comparisonData.forEach((row) => {
      // Функция для красивых иконок: зеленая галочка или красный крестик
      const getIcon = (isActive) =>
        isActive
          ? '<i class="fas fa-check" style="color: #2ecc71;"></i>'
          : '<i class="fas fa-times" style="color: #e74c3c;"></i>';
      tbody.innerHTML += scope.sanitizeHtml(`
            <tr>
                <td style="color: #ccc;">${row.feature}</td>
                <td>${getIcon(row.m1)}</td>
                <td>${getIcon(row.m2)}</td>
                <td>${getIcon(row.m3)}</td>
            </tr>
        `);
    });
    modal.style.display = "flex";
  }
  scope.document.addEventListener("DOMContentLoaded", init);
  function applyAuthenticatedUser(data) {
    stopPolling();
    token = data.access_token;
    scope.window.token = token;
    localStorage.setItem("authToken", token);
    const user = data.user;
    for (const [key, value] of Object.entries({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userAvatar: user.avatar,
      userCredits: user.credits,
    })) {
      if (value !== undefined && value !== null)
        localStorage.setItem(key, String(value));
    }
    updateUIState(true, user);
    if (user.credits !== undefined) updateBalanceUI(user.credits);
    initGlobalSockets();
    fetchUserData();
  }
  Object.defineProperty(context, "API_BASE_URL", {
    configurable: true,
    get: () => API_BASE_URL,
    set: (value) => {
      API_BASE_URL = value;
    },
  });
  Object.defineProperty(context, "socket", {
    configurable: true,
    get: () => socket,
    set: (value) => {
      socket = value;
    },
  });
  Object.defineProperty(context, "pollingInterval", {
    configurable: true,
    get: () => pollingInterval,
    set: (value) => {
      pollingInterval = value;
    },
  });
  Object.defineProperty(context, "currentProduct", {
    configurable: true,
    get: () => currentProduct,
    set: (value) => {
      currentProduct = value;
    },
  });
  Object.defineProperty(context, "urlParams", {
    configurable: true,
    get: () => urlParams,
  });
  Object.defineProperty(context, "tokenFromUrl", {
    configurable: true,
    get: () => tokenFromUrl,
  });
  Object.defineProperty(context, "refCode", {
    configurable: true,
    get: () => refCode,
  });
  Object.defineProperty(context, "token", {
    configurable: true,
    get: () => token,
    set: (value) => {
      token = value;
    },
  });
  Object.defineProperty(context, "currentUserName", {
    configurable: true,
    get: () => currentUserName,
    set: (value) => {
      currentUserName = value;
    },
  });
  Object.defineProperty(context, "currentUserEmail", {
    configurable: true,
    get: () => currentUserEmail,
    set: (value) => {
      currentUserEmail = value;
    },
  });
  Object.defineProperty(context, "currentUserAvatar", {
    configurable: true,
    get: () => currentUserAvatar,
    set: (value) => {
      currentUserAvatar = value;
    },
  });
  Object.defineProperty(context, "currentUserRole", {
    configurable: true,
    get: () => currentUserRole,
    set: (value) => {
      currentUserRole = value;
    },
  });
  Object.defineProperty(context, "productsGrid", {
    configurable: true,
    get: () => productsGrid,
  });
  Object.defineProperty(context, "loginModal", {
    configurable: true,
    get: () => loginModal,
  });
  Object.defineProperty(context, "loginBtn", {
    configurable: true,
    get: () => loginBtn,
  });
  Object.defineProperty(context, "closeLogin", {
    configurable: true,
    get: () => closeLogin,
  });
  Object.defineProperty(context, "showSignup", {
    configurable: true,
    get: () => showSignup,
  });
  Object.defineProperty(context, "showLogin", {
    configurable: true,
    get: () => showLogin,
  });
  Object.defineProperty(context, "logoutContainer", {
    configurable: true,
    get: () => logoutContainer,
  });
  Object.defineProperty(context, "logoutBtn", {
    configurable: true,
    get: () => logoutBtn,
  });
  Object.defineProperty(context, "welcomeMessage", {
    configurable: true,
    get: () => welcomeMessage,
  });
  Object.defineProperty(context, "affLink", {
    configurable: true,
    get: () => affLink,
  });
  Object.defineProperty(context, "profilePanel", {
    configurable: true,
    get: () => profilePanel,
  });
  Object.defineProperty(context, "navUsername", {
    configurable: true,
    get: () => navUsername,
  });
  Object.defineProperty(context, "navAvatar", {
    configurable: true,
    get: () => navAvatar,
  });
  Object.defineProperty(context, "navIcon", {
    configurable: true,
    get: () => navIcon,
  });
  Object.defineProperty(context, "menuName", {
    configurable: true,
    get: () => menuName,
  });
  Object.defineProperty(context, "menuEmail", {
    configurable: true,
    get: () => menuEmail,
  });
  Object.defineProperty(context, "menuCredits", {
    configurable: true,
    get: () => menuCredits,
  });
  Object.defineProperty(context, "dropdownAvatars", {
    configurable: true,
    get: () => dropdownAvatars,
  });
  Object.defineProperty(context, "dropdownLogoutBtn", {
    configurable: true,
    get: () => dropdownLogoutBtn,
  });
  Object.defineProperty(context, "notificationBadge", {
    configurable: true,
    get: () => notificationBadge,
  });
  Object.defineProperty(context, "closeProfilePanelBtn", {
    configurable: true,
    get: () => closeProfilePanelBtn,
  });
  Object.defineProperty(context, "creditBalance", {
    configurable: true,
    get: () => creditBalance,
  });
  Object.defineProperty(context, "checkoutModal", {
    configurable: true,
    get: () => checkoutModal,
  });
  Object.defineProperty(context, "closeCheckoutBtn", {
    configurable: true,
    get: () => closeCheckoutBtn,
  });
  Object.defineProperty(context, "payBtn", {
    configurable: true,
    get: () => payBtn,
  });
  Object.defineProperty(context, "searchInput", {
    configurable: true,
    get: () => searchInput,
  });
  Object.defineProperty(context, "exploreBtn", {
    configurable: true,
    get: () => exploreBtn,
  });
  Object.defineProperty(context, "navLinks", {
    configurable: true,
    get: () => navLinks,
  });
  Object.defineProperty(context, "products", {
    configurable: true,
    get: () => products,
  });
  Object.defineProperty(context, "SVG_ICONS", {
    configurable: true,
    get: () => SVG_ICONS,
  });
  Object.defineProperty(context, "updateBalanceUI", {
    configurable: true,
    get: () => updateBalanceUI,
  });
  Object.defineProperty(context, "updateUIState", {
    configurable: true,
    get: () => updateUIState,
  });
  Object.defineProperty(context, "renderBadge", {
    configurable: true,
    get: () => renderBadge,
  });
  Object.defineProperty(context, "updateNotificationsBadge", {
    configurable: true,
    get: () => updateNotificationsBadge,
  });
  Object.defineProperty(context, "handleLogout", {
    configurable: true,
    get: () => handleLogout,
  });
  Object.defineProperty(context, "updateAdminDashboardVisibility", {
    configurable: true,
    get: () => updateAdminDashboardVisibility,
  });
  Object.defineProperty(context, "loadAffiliateData", {
    configurable: true,
    get: () => loadAffiliateData,
  });
  Object.defineProperty(context, "fetchUserData", {
    configurable: true,
    get: () => fetchUserData,
  });
  Object.defineProperty(context, "fetchUserProfile", {
    configurable: true,
    get: () => fetchUserProfile,
  });
  Object.defineProperty(context, "showToast", {
    configurable: true,
    get: () => showToast,
  });
  Object.defineProperty(context, "initGlobalSockets", {
    configurable: true,
    get: () => initGlobalSockets,
  });
  Object.defineProperty(context, "loadProfileData", {
    configurable: true,
    get: () => loadProfileData,
  });
  Object.defineProperty(context, "checkPaymentStatus", {
    configurable: true,
    get: () => checkPaymentStatus,
  });
  Object.defineProperty(context, "openCheckout", {
    configurable: true,
    get: () => openCheckout,
  });
  Object.defineProperty(context, "showLoginForm", {
    configurable: true,
    get: () => showLoginForm,
  });
  Object.defineProperty(context, "openLoginModal", {
    configurable: true,
    get: () => openLoginModal,
  });
  Object.defineProperty(context, "closeLoginModal", {
    configurable: true,
    get: () => closeLoginModal,
  });
  Object.defineProperty(context, "showSignupForm", {
    configurable: true,
    get: () => showSignupForm,
  });
  Object.defineProperty(context, "processPayment", {
    configurable: true,
    get: () => processPayment,
  });
  Object.defineProperty(context, "getSvgIllustration", {
    configurable: true,
    get: () => getSvgIllustration,
  });
  Object.defineProperty(context, "initProductsEventListeners", {
    configurable: true,
    get: () => initProductsEventListeners,
  });
  Object.defineProperty(context, "loadProducts", {
    configurable: true,
    get: () => loadProducts,
  });
  Object.defineProperty(context, "updateUserUI", {
    configurable: true,
    get: () => updateUserUI,
  });
  Object.defineProperty(context, "handleLoginSubmit", {
    configurable: true,
    get: () => handleLoginSubmit,
  });
  Object.defineProperty(context, "handleSignupSubmit", {
    configurable: true,
    get: () => handleSignupSubmit,
  });
  Object.defineProperty(context, "handleLoginButtonClick", {
    configurable: true,
    get: () => handleLoginButtonClick,
  });
  Object.defineProperty(context, "updateLoginButton", {
    configurable: true,
    get: () => updateLoginButton,
  });
  Object.defineProperty(context, "handleSearch", {
    configurable: true,
    get: () => handleSearch,
  });
  Object.defineProperty(context, "toggleProfilePanel", {
    configurable: true,
    get: () => toggleProfilePanel,
  });
  Object.defineProperty(context, "stopPolling", {
    configurable: true,
    get: () => stopPolling,
  });
  Object.defineProperty(context, "startPolling", {
    configurable: true,
    get: () => startPolling,
  });
  Object.defineProperty(context, "setupEventListeners", {
    configurable: true,
    get: () => setupEventListeners,
  });
  Object.defineProperty(context, "avatarBtn", {
    configurable: true,
    get: () => avatarBtn,
  });
  Object.defineProperty(context, "setupNavigation", {
    configurable: true,
    get: () => setupNavigation,
  });
  Object.defineProperty(context, "setupBurgerMenu", {
    configurable: true,
    get: () => setupBurgerMenu,
  });
  Object.defineProperty(context, "copyAffBtn", {
    configurable: true,
    get: () => copyAffBtn,
  });
  Object.defineProperty(context, "requestPayout", {
    configurable: true,
    get: () => requestPayout,
  });
  Object.defineProperty(context, "loadTransactionHistory", {
    configurable: true,
    get: () => loadTransactionHistory,
  });
  Object.defineProperty(context, "renderPagination", {
    configurable: true,
    get: () => renderPagination,
  });
  Object.defineProperty(context, "purchasePack", {
    configurable: true,
    get: () => purchasePack,
  });
  Object.defineProperty(context, "CONFIG", {
    configurable: true,
    get: () => CONFIG,
  });
  Object.defineProperty(context, "initScrollAnimations", {
    configurable: true,
    get: () => initScrollAnimations,
  });
  Object.defineProperty(context, "handleBillingUpdate", {
    configurable: true,
    get: () => handleBillingUpdate,
  });
  Object.defineProperty(context, "setupTabs", {
    configurable: true,
    get: () => setupTabs,
  });
  Object.defineProperty(context, "FAQManager", {
    configurable: true,
    get: () => FAQManager,
  });
  Object.defineProperty(context, "setupGlobalClickHandlers", {
    configurable: true,
    get: () => setupGlobalClickHandlers,
  });
  Object.defineProperty(context, "init", {
    configurable: true,
    get: () => init,
  });
  Object.defineProperty(context, "aiModelsData", {
    configurable: true,
    get: () => aiModelsData,
  });
  Object.defineProperty(context, "quickActionsData", {
    configurable: true,
    get: () => quickActionsData,
  });
  Object.defineProperty(context, "isImageIcon", {
    configurable: true,
    get: () => isImageIcon,
  });
  Object.defineProperty(context, "renderAiModelIcon", {
    configurable: true,
    get: () => renderAiModelIcon,
  });
  Object.defineProperty(context, "openCategoryModal", {
    configurable: true,
    get: () => openCategoryModal,
  });
  Object.defineProperty(context, "openAiModelModalById", {
    configurable: true,
    get: () => openAiModelModalById,
  });
  Object.defineProperty(context, "openAiModelModal", {
    configurable: true,
    get: () => openAiModelModal,
  });
  Object.defineProperty(context, "applyAuthenticatedUser", {
    configurable: true,
    get: () => applyAuthenticatedUser,
  });
  scope.expose("updateBalanceUI", updateBalanceUI);
  scope.expose("updateUIState", updateUIState);
  scope.expose("renderBadge", renderBadge);
  scope.expose("updateNotificationsBadge", updateNotificationsBadge);
  scope.expose("handleLogout", handleLogout);
  scope.expose(
    "updateAdminDashboardVisibility",
    updateAdminDashboardVisibility,
  );
  scope.expose("loadAffiliateData", loadAffiliateData);
  scope.expose("fetchUserData", fetchUserData);
  scope.expose("fetchUserProfile", fetchUserProfile);
  scope.expose("showToast", showToast);
  scope.expose("initGlobalSockets", initGlobalSockets);
  scope.expose("loadProfileData", loadProfileData);
  scope.expose("checkPaymentStatus", checkPaymentStatus);
  scope.expose("openCheckout", openCheckout);
  scope.expose("showLoginForm", showLoginForm);
  scope.expose("openLoginModal", openLoginModal);
  scope.expose("closeLoginModal", closeLoginModal);
  scope.expose("showSignupForm", showSignupForm);
  scope.expose("processPayment", processPayment);
  scope.expose("getSvgIllustration", getSvgIllustration);
  scope.expose("initProductsEventListeners", initProductsEventListeners);
  scope.expose("loadProducts", loadProducts);
  scope.expose("updateUserUI", updateUserUI);
  scope.expose("handleLoginSubmit", handleLoginSubmit);
  scope.expose("handleSignupSubmit", handleSignupSubmit);
  scope.expose("handleLoginButtonClick", handleLoginButtonClick);
  scope.expose("updateLoginButton", updateLoginButton);
  scope.expose("handleSearch", handleSearch);
  scope.expose("toggleProfilePanel", toggleProfilePanel);
  scope.expose("stopPolling", stopPolling);
  scope.expose("startPolling", startPolling);
  scope.expose("setupEventListeners", setupEventListeners);
  scope.expose("setupNavigation", setupNavigation);
  scope.expose("setupBurgerMenu", setupBurgerMenu);
  scope.expose("requestPayout", requestPayout);
  scope.expose("loadTransactionHistory", loadTransactionHistory);
  scope.expose("renderPagination", renderPagination);
  scope.expose("purchasePack", purchasePack);
  scope.expose("initScrollAnimations", initScrollAnimations);
  scope.expose("handleBillingUpdate", handleBillingUpdate);
  scope.expose("setupTabs", setupTabs);
  scope.expose("setupGlobalClickHandlers", setupGlobalClickHandlers);
  scope.expose("init", init);
  scope.expose("isImageIcon", isImageIcon);
  scope.expose("renderAiModelIcon", renderAiModelIcon);
  scope.expose("openCategoryModal", openCategoryModal);
  scope.expose("openAiModelModalById", openAiModelModalById);
  scope.expose("openAiModelModal", openAiModelModal);
  scope.expose("applyAuthenticatedUser", applyAuthenticatedUser);
  scope.cleanup(() => {
    stopPolling();
    if (socket) socket.disconnect();
  });
}
