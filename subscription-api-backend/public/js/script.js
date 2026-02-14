var API_BASE_URL = 'https://genyxo.com';
let socket;

const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get('token');
const refId = urlParams.get('ref');

if (tokenFromUrl) {
    localStorage.setItem('authToken', tokenFromUrl);
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
}

let token = localStorage.getItem('authToken');

if (refId) {
    localStorage.setItem('referrerId', refId);
    console.log('Referrer ID saved:', refId);
    // Можно тоже почистить URL от ref:
    // const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    // window.history.replaceState({}, document.title, cleanUrl);
}

let currentUserName = localStorage.getItem('userName') || 'My Profile';
let currentUserEmail = localStorage.getItem('userEmail');
let currentUserAvatar = localStorage.getItem('userAvatar');

// --- DOM Elements ---
const productsGrid = document.getElementById('productsGrid');

// Login / Profile Elements
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const closeLogin = document.getElementById('closeLogin');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const logoutContainer = document.getElementById('logoutContainer');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');
const affLink = document.getElementById('referralLinkInput');

// Profile Panel Elements
const profilePanel = document.getElementById('profilePanel');
const navUsername = document.getElementById('navUsername');
const navAvatar = document.getElementById('navAvatar');
const navIcon = document.getElementById('navIcon');
const menuName = document.getElementById('menuName');
const menuEmail = document.getElementById('menuEmail');
const menuCredits = document.getElementById('menuCredits');
const dropdownAvatars = document.querySelectorAll('.dropdown-avatar');
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
const notificationBadge = document.getElementById('notificationBadge');
const closeProfilePanelBtn = document.getElementById('closeProfilePanel');

// Checkout Elements (НОВІ)
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckout');
const payBtn = document.getElementById('payBtn');

// Search & Nav
const searchInput = document.querySelector('.search-input');
const exploreBtn = document.getElementById('exploreBtn');
const navLinks = document.querySelectorAll('.nav-link');

let pollingInterval = null;
let currentProduct = null;

const products = [
    { id: 1, price: "$3.99", image: "./images/startai.jpg", alt: "StartAI Pack" },
    { id: 2, price: "$9.99", image: "./images/aiexplorer.jpg", alt: "AI Explorer Pack" },
    { id: 3, price: "$24.99", image: "./images/procreatorai.jpg", alt: "Pro Creator AI Pack" },
    { id: 4, price: "$49.99", image: "./images/aimaster.jpg", alt: "AI Master Pack" },
    { id: 5, price: "$99.99", image: "./images/unlimitedpower.jpg", alt: "Unlimited Power Pack" },
    { id: 6, price: "$219.99", image: "./images/aititan.jpg", alt: "AI Titan Pack" },
];

function updateBalanceUI(amount) {
    menuCredits.textContent = `${amount} Credits`;
}

function updateUIState(isLoggedIn, userData = null) {
    if (isLoggedIn && userData) {
        // Якщо користувач увійшов:
        if (navUsername) navUsername.textContent = userData.name || userData.email || 'User';
        if (navIcon) navIcon.style.display = 'none';
        
        if (navAvatar) {
            navAvatar.style.display = 'block';
            navAvatar.src = userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name || 'User'}`;
            navAvatar.alt = "User Avatar";
        }

        if (menuName) menuName.textContent = userData.name || 'User';
        if (menuEmail) menuEmail.textContent = userData.email || '';
        
        if (dropdownAvatars) {
            dropdownAvatars.forEach(img => {
                img.src = userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name || 'User'}`;
                img.alt = "User Avatar";
            });
        }
        
        if (userData.credits !== undefined && menuCredits) {
             menuCredits.textContent = parseFloat(userData.credits).toLocaleString();
        }

        if (loginBtn) {
            loginBtn.classList.add('profile-toggle-btn');
            loginBtn.classList.add('login-btn');
        }

    } else {
        // Якщо гість:
        if (navUsername) navUsername.textContent = 'Register / Login';
        if (navIcon) navIcon.style.display = 'inline-block';
        if (navAvatar) navAvatar.style.display = 'none';
        
        if (loginBtn) {
            loginBtn.classList.add('login-btn');
            loginBtn.classList.remove('profile-toggle-btn');
        }
        
        if (profilePanel) profilePanel.classList.remove('show');
    }
}

function renderBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (count > 0) {
        badge.style.display = 'flex';
        badge.innerText = count > 99 ? '99+' : count;
    } else {
        badge.style.display = 'none';
    }
}

async function updateNotificationsBadge() {
    const token = localStorage.getItem('authToken'); 
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderBadge(data.count);
        }
    } catch (e) {
        console.warn("Could not update badge:", e);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userAvatar');
    authToken = null;
    
    updateUIState(false);
    window.location.reload();
}

async function loadAffiliateData() {
    const authToken = localStorage.getItem('authToken');
    const affBalance = parseFloat(document.getElementById('affiliateBalance').innerText);
    const linkInput = document.getElementById('referralLinkInput');

    if (!authToken || !affBalance) return;

    try {
        const response = await fetch(`${API_BASE_URL}/profile/affiliate`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            const rawBalance = parseFloat(data.balance || 0);
            affBalance.textContent = rawBalance.toFixed(2);

            if (linkInput) {
                linkInput.value = data.referralLink || 'Error generating link';
            }

            const invitedElement = document.getElementById('invitedCount');
            if (invitedElement) {
                invitedElement.textContent = data.invitedCount || 0;
            }

        } else {
            console.warn('Failed to load affiliate stats');
        }
    } catch (e) {
        console.error("Affiliate load error:", e);
    }
}

async function fetchUserData() {
    const affBalance = document.getElementById('affiliateBalance');
    
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('userName', user.name || '');
            localStorage.setItem('userEmail', user.email || '');
            if (user.avatar) localStorage.setItem('userAvatar', user.avatar);

            updateUIState(true, user);
            updateNotificationsBadge();

            if (affBalance !== null && affBalance !== undefined) {
                loadAffiliateData(); 
            }
        } else {
            console.warn('Token expired or invalid');
            handleLogout();
        }
    } catch (e) {
        console.error("Loading Profile Error:", e);
    }
}

async function fetchUserProfile(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userId', user.id);
            if (user.name) localStorage.setItem('userName', user.name);
            if (user.avatar) localStorage.setItem('userAvatar', user.avatar);

            updateUIState(true, user);
        } else {
             localStorage.removeItem('authToken');
             updateUIState(false);
        }
    } catch (e) {
        console.error("Profile fetch error", e);
        localStorage.removeItem('authToken');
        updateUIState(false);
    }
}

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.animation = 'slideInToast 0.3s forwards';
    });

    const hideMs = Number(duration) || 3000;
    const hideAnimMs = 300;

    const hideTimer = setTimeout(() => {
        toast.style.animation = '';
        void toast.offsetWidth;

        toast.classList.add('hiding');

        const removeFallback = setTimeout(() => {
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
        }, hideAnimMs + 50);

        toast.addEventListener('animationend', function onAnim(e) {
            if (e.target !== toast) return;
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            clearTimeout(removeFallback);
            toast.removeEventListener('animationend', onAnim);
        });
    }, hideMs);

    return {
        hideTimer,
        element: toast
    };
}

function initGlobalSockets() {
    const token = localStorage.getItem('authToken');
    if (!token || typeof io === 'undefined') return;

    socket = io('https://genyxo.com/notifications', {
        auth: { token }
    });

    socket.on('unread_count_update', (data) => {
        renderBadge(data.count);
    });

    socket.on('new_notification', (n) => {
        if (typeof showToast === 'function') {
            showToast(`${n.title}: ${n.message}`, 'info');
        }
        
        if (window.location.pathname.includes('notifications.html') && typeof prependNotification === 'function') {
            prependNotification(n);
        }
    });
}

async function loadProfileData() {
    /* if (!authToken) {
        const protectedPages = ['profile.html', 'notifications.html', 'support.html'];
        if (protectedPages.some(page => window.location.pathname.includes(page))) {
            window.location.href = 'index.html';
        }
        return;
    } */

    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Failed to fetch profile');
        const user = await response.json();

        const elements = {
            navUsername: document.getElementById('navUsername'),
            navIcon: document.getElementById('navIcon'),
            navAvatar: document.getElementById('navAvatar'),
            loginBtn: document.getElementById('loginBtn'),
            menuName: document.getElementById('menuName'),
            menuEmail: document.getElementById('menuEmail'),
            menuCredits: document.getElementById('menuCredits'),
            dropdownAvatar: document.querySelector('.dropdown-avatar')
        };

        if (user.id) {
            const avatarUrl = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;

            if (elements.navUsername) elements.navUsername.textContent = user.name || 'Profile';
            
            if (elements.navIcon) elements.navIcon.style.display = 'none';
            
            if (elements.navAvatar) {
                elements.navAvatar.src = avatarUrl;
                elements.navAvatar.style.display = 'inline-block';
                elements.navAvatar.alt = "User Avatar";
            }

            if (elements.loginBtn) {
                elements.loginBtn.classList.remove('login-btn');
                elements.loginBtn.classList.add('profile-toggle-btn');
            }

            if (elements.menuName) elements.menuName.textContent = user.name ||  'User';
            if (elements.menuEmail) elements.menuEmail.textContent = user.email || '';
            if (elements.menuCredits) elements.menuCredits.textContent = (user.credits || 0).toLocaleString();
            if (elements.dropdownAvatar) {
                elements.dropdownAvatar.src = avatarUrl;
                elements.dropdownAvatar.alt = "User Avatar";
            }
        }

        const profileName = document.getElementById('profileName');
        if (profileName) profileName.textContent = user.name || 'User';

        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview && user.avatar) {
            avatarPreview.style.backgroundImage = `url("${user.avatar}")`;
            avatarPreview.alt = "User Avatar";
        } else if (avatarPreview && user.name) {
            avatarPreview.style.backgroundImage = `url("https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}")`;
            avatarPreview.alt = "User Avatar";
        }

        const nameInput = document.querySelector('input[placeholder="John Doe"]');
        if (nameInput) nameInput.value = user.name || '';

        const emailInput = document.querySelector('input[placeholder="your@email.com"]');
        if (emailInput) emailInput.value = user.email || '';

        const logoutBtn = document.getElementById('dropdownLogoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                localStorage.removeItem('authToken');
                window.location.href = 'index.html';
            };
        }

    } catch (e) {
        console.error("Error loading profile:", e);
    }
}

function checkPaymentStatus() {
    if (window.location.hash === '#success') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
        
        const msg = window.i18n?.translations?.toasts?.payment_success || 'Payment successful!';
        showToast(msg, 'Payment successful! Credits added.', 'success');
        
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInOut(min, max) {
          return Math.random() * (max - min) + min;
        }

        var interval = setInterval(function() {
          var timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          var particleCount = 50 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.1, 0.3), y: Math.random() - 0.2 } }));
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    } else if (window.location.hash === '#cancel') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
        const msg = window.i18n?.translations?.toasts?.payment_cancel || 'Payment cancelled.';
        showToast(msg, 'Payment cancelled.', 'error');
    }
}

function openCheckout(product) {
    currentProduct = product;

    const productTrans = (window.i18n && i18n.translations.products_data && i18n.translations.products_data[product.id]) 
                         ? i18n.translations.products_data[product.id] 
                         : { name: 'AI Pack', credits_label: 'Credits' };

    document.getElementById('checkoutImg').src = product.image;
    document.getElementById('checkoutImg').alt = productTrans.name;
    document.getElementById('checkoutName').textContent = productTrans.name;
    document.getElementById('checkoutCredits').textContent = productTrans.credits_label.replace(/\D/g, ''); 
    document.getElementById('checkoutPrice').textContent = product.price;
    document.getElementById('checkoutTotal').textContent = product.price;

    checkoutModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showLoginForm() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
}

function openLoginModal() {
    if (loginModal) {
        loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    if (logoutContainer) {
        logoutContainer.style.display = 'none';
    }

    showLoginForm();
}

function closeLoginModal() {
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    loginForm.reset();
    signupForm.reset();
}

function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
}

async function processPayment() {
    if (!authToken) {
        checkoutModal.style.display = 'none';
        openLoginModal();
        return;
    }

    if (!currentProduct) return;

    payBtn.classList.add('loading');
    payBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/payment/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                packId: currentProduct.id
            })
        });

        const data = await response.json();

        if (response.ok && data.url) {
            window.location.href = data.url;
        } else {
            showToast(`Error: ${data.message || 'Failed to create payment'}`, 'error');
            payBtn.classList.remove('loading');
            payBtn.disabled = false;
        }
    } catch (error) {
        console.error(error);
        showToast('Connection error. Please try again.', 'error');
        payBtn.classList.remove('loading');
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
        </svg>`
    };

    return illustrations[id] || '<img src="https://via.placeholder.com/300x200?text=Product" alt="Product">';
}

function loadProducts() {
    if (!productsGrid) {
        return;
    }

    productsGrid.innerHTML = '';
    
    if (!window.i18n || !window.i18n.translations || !window.i18n.translations.products_data) {
        console.warn("Localization data not fully loaded yet.");
        return; 
    }
    
    const translations = window.i18n.translations.products_data;

    products.forEach(product => {
        const productTrans = translations[product.id.toString()]; 
        if (!productTrans) return;
        
        const featuresHtml = productTrans.features.map(feature => `
            <li><span class="feature-icon"><i class="fas fa-check"></i></span>${feature}</li>
        `).join('');

        const illustrationHtml = getSvgIllustration(product.id);

        const productCard = document.createElement('div');
        productCard.className = 'product-card glass';

        productCard.innerHTML = `
            <div class="product-image">
                ${illustrationHtml}
            </div>
            <div class="product-info">
                <h3 class="product-name">${productTrans.name}</h3>
                <div class="product-price">${product.price}</div>
                <ul class="product-features">
                    <li><span class="feature-icon icon-bolt"><i class="fas fa-bolt"></i></span>${productTrans.credits_label}</li>
                    ${featuresHtml}
                </ul>
                <button class="buy-btn" data-id="${product.id}">
                    ${translations.buy_now} 
                </button>
            </div>`;
        productsGrid.appendChild(productCard);
    });

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnElement = e.target.closest('.buy-btn');
            const productId = parseInt(btnElement.getAttribute('data-id'));
            const product = products.find(p => p.id === productId);
            openCheckout(product);
        });
    });
}

function updateUserUI(user) {
    if (navUsername) navUsername.textContent = user.name || user.email;
    
    if (user.avatar) {
        if(navIcon) navIcon.style.display = 'none';
        if(navAvatar) {
            navAvatar.style.display = 'block';
            navAvatar.src = user.avatar;
            navAvatar.alt = "User Avatar";
        }
        dropdownAvatars.forEach(img => {
            img.src = user.avatar;
            img.alt = "User Avatar";
        });
    } else {
        dropdownAvatars.forEach(img => {
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.name || 'User');
            img.alt = "Default User Avatar";
        });
    }

    if (menuName) menuName.textContent = user.name || 'User';
    if (menuEmail) menuEmail.textContent = user.email;
    if (menuCredits) menuCredits.textContent = (user.credits || 0).toLocaleString();
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            authToken = data.access_token;

            if (data.user) {
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
            }
            
            await fetchUserData();
            closeLoginModal();

            const msg = window.i18n?.translations?.toasts?.welcome || 'Welcome back!';
            showToast(msg, 'success');

            loginModal.style.display = 'none';
        } else {
            showToast(
                window.i18n?.translations?.toasts?.login_error || 'Invalid email or password',
                'error'
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast(
            window.i18n?.translations?.toasts?.server_error || 'Server error',
            'error'
        );
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        const msg = window.i18n?.translations?.toasts?.pass_mismatch || 'Passwords do not match!';
        showToast(msg, 'error');
        return;
    }

    const savedRefId = localStorage.getItem('referrerId');

    const formData = {
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        password: document.getElementById('signupPassword').value,
        referrerId: savedRefId ? Number(savedRefId) : null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            authToken = data.access_token;

            if (data.user) {
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
            }

            await fetchUserData();
            closeLoginModal();
            showToast(
                window.i18n?.translations?.toasts?.account_created || 'Welcome!',
                'success'
            );

            loginModal.style.display = 'none';
        } else {
            showToast(
                window.i18n?.translations?.toasts?.reg_failed || 'Registration Failed',
                'error'
            );
        }
    } catch (error) {
        showToast(
            window.i18n?.translations?.toasts?.server_error || 'Server error',
            'error'
        );
    }
}

function handleLoginButtonClick(e) {
    e.stopPropagation();
    if (authToken) {
        profilePanel.classList.toggle('show');
    } else {
        openLoginModal();
    }
}

function updateLoginButton(name, token) {
    const navUsername = document.getElementById('navUsername');
    const navIcon = document.getElementById('navIcon');
    const navAvatar = document.getElementById('navAvatar');
    const profilePanel = document.getElementById('profilePanel');

    if (token) {
        if (navUsername) navUsername.textContent = name;
        if (navIcon) navIcon.style.display = 'none'; 
        if (navAvatar) navAvatar.style.display = 'block'; 
    } else {
        if (navUsername) navUsername.textContent = 'Register / Login';
        if (navIcon) navIcon.style.display = 'inline-block';
        if (navAvatar) navAvatar.style.display = 'none';
        
        if (profilePanel) profilePanel.classList.remove('show');
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!window.i18n || !window.i18n.translations) return;
    const translations = i18n.translations.products_data || {};

    const filteredProducts = products.filter(product => {
        const productTrans = translations[product.id.toString()];
        return productTrans && productTrans.name.toLowerCase().includes(searchTerm);
    });

    productsGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `<div class="glass" style="grid-column: 1/-1; padding: 2rem; text-align: center;">No products found</div>`;
        return;
    }

    filteredProducts.forEach(product => {
        const productTrans = translations[product.id.toString()];
        const featuresHtml = productTrans.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('');
        
        const card = document.createElement('div');
        card.className = 'product-card glass';
        card.innerHTML = `
            <div class="product-image"><img src="${product.image}" alt="${productTrans.name}"></div>
            <div class="product-info">
                <h3>${productTrans.name}</h3>
                <div class="product-price">${product.price}</div>
                <ul class="product-features">${featuresHtml}</ul>
                <button class="buy-btn" data-id="${product.id}">${translations.buy_now}</button>
            </div>
        `;
        productsGrid.appendChild(card);
    });

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.closest('.buy-btn').getAttribute('data-id'));
            const product = products.find(p => p.id === productId);
            openCheckout(product);
        });
    });
}

function toggleProfilePanel() {
    const profilePanel = document.getElementById('profilePanel');
    if (profilePanel) {
        profilePanel.classList.toggle('show');
    }
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function startPolling(email, password) {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (res.ok) {
                const data = await res.json();
                stopPolling();
                
                localStorage.setItem('authToken', data.access_token);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userId', data.user.id);
                
                document.getElementById('verifyEmailModal').style.display = 'none';
                
                showToast('Email verified! Welcome!', 'success');
                updateUIState(true, user);
            }
        } catch (e) {
            
        }
    }, 3000); 
}

function setupEventListeners() {
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (loginBtn.classList.contains('profile-toggle-btn')) {
                toggleProfilePanel(); 
            } else {
                openLoginModal();
            }
        });
    }

    if (closeProfilePanelBtn) {
        closeProfilePanelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profilePanel) profilePanel.classList.remove('show');
        });
    }

    if (closeLogin) {
        closeLogin.addEventListener('click', closeLoginModal);
    }

    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', handleLogout);
    }

    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', () => {
            checkoutModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            payBtn.classList.remove('loading');
            payBtn.disabled = false;
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            try {
                const res = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('authToken', data.access_token);
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userId', data.user.id);
                    if(data.user.name) localStorage.setItem('userName', data.user.name);

                    document.getElementById('loginModal').style.display = 'none';
                    
                    updateUIState(true, user);
                    showToast('Welcome back!', 'success');
                } else {
                    if (res.status === 401) {
                        showToast('Invalid email or password. Please try again.', 'error');
                    } 
                    else if (res.status === 404 || data.message.includes('Incorrect email or password')) {
                        showToast('User does not exist. Please Sign Up first.', 'error');
                        switchTab('signup'); 
                    } else {
                        showToast(data.message || 'Login failed', 'error');
                    }
                }
            } catch (error) {
                console.error(error);
                showToast('Connection error', 'error');
            }
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            if (password !== confirmPass) {
                showToast('Passwords do not match', 'error');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    document.getElementById('loginModal').style.display = 'none';
                
                    const verifyModal = document.getElementById('verifyEmailModal');
                    if (verifyModal) {
                        verifyModal.style.display = 'flex';
                        startPolling(email, password);
                    } else {
                        showToast('Registration successful! Please check your email.', 'success');
                    }
                } else {
                    if (res.status === 409) {
                        showToast('This email is already registered. Please Log In.', 'error');
                    } else {
                        showToast(data.message || 'Registration failed', 'error');
                    }
                }
            } catch (error) {
                showToast('Server error during registration', 'error');
            }
        });
    }

    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            const products = document.getElementById('products');
            if (products) products.scrollIntoView({ behavior: 'smooth' });
        });
    }

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-container') && profilePanel.classList.contains('show')) {
            profilePanel.classList.remove('show');
        }
        if (e.target === checkoutModal) {
            checkoutModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

const avatarBtn = document.getElementById('profileToggleBtn');
if (avatarBtn) {
    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfilePanel();
    });
}

function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                document.getElementById(href.substring(1)).scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function setupBurgerMenu() {
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');

    if (!burger || !mobileMenu || !overlay) return;

    function closeMenu() {
        burger.classList.remove('active');
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
    }

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    overlay.addEventListener('click', closeMenu);
}

const copyAffBtn = document.getElementById('copyAffBtn');
if (copyAffBtn) {
    copyAffBtn.addEventListener('click', () => {
        if (affLink && affLink.value) {
            affLink.select();
            affLink.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(affLink.value).then(() => {
                showToast('Referral link copied!', 'success');
            }).catch(err => {
                console.error('Copy failed', err);
                document.execCommand('copy'); 
                showToast('Link copied!', 'success');
            });
        }
    });
}

function requestPayout() {
    const affBalance = parseFloat(document.getElementById('affiliateBalance').innerText);
    if (!affBalance) return;
    if (affBalance < 10) {
        showToast('Minimum withdrawal amount is $10.00', 'error');
        return;
    }
    if(confirm(`Request payout of $${affBalance}? Support will contact you via email.`)) {
        showToast('Request sent! Support will contact you shortly.', 'success');
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

function renderPagination(meta) {
    const container = document.getElementById('pagination-controls');
    let html = '';
    for (let i = 1; i <= meta.totalPages; i++) {
        html += `<button class="${i === meta.currentPage ? 'active' : ''}" onclick="loadTransactionHistory(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

async function loadTransactionHistory(page = 1) {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/profile/transactions?page=${page}&limit=5`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        
        const data = await response.json();

        tbody.innerHTML = data.items.map(tx => `
            <tr>
                <td>${new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
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
        `).join('');

        renderPagination(Math.ceil(data.total / 5), page);

    } catch (err) {
        console.error("Failed to load transactions", err);
    }
}

async function purchasePack(packId) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    try {
        const res = await fetch(`${API_BASE_URL}/payment/buy`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ packId })
        });
        const result = await res.json();
        
        if (result.url) {
            window.location.href = result.url;
        } else {
            showToast('Something went wrong', 'error');
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Get Credits';
        showToast('Payment initialization failed', 'error');
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
        if (event.target.id === 'verifyEmailModal') {
            stopPolling();
        }
    }
}

setInterval(updateNotificationsBadge, 60000);

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const navButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    if (token) {
        console.log("Google token found, starting login process...");
        localStorage.setItem('authToken', token);

        window.history.replaceState({}, document.title, "/");
        
        fetchUserProfile(token);

        showToast('Successfully logged in with Google!', 'success');

    } else {
        if (token) {
            fetchUserProfile(token);
        } else {
            updateUIState(false);
        }
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');
            if (!targetTabId) return;

            console.log('Switching to tab:', targetTabId);

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => {
                content.style.display = 'none';
                content.style.opacity = '0';
            });

            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
                targetTab.style.display = 'block';
                setTimeout(() => {
                    targetTab.style.opacity = '1';
                }, 50);
                
                if (targetTabId === 'billing-section') {
                    loadTransactionHistory(1);
                    const credits = localStorage.getItem('userCredits') || '0';
                    document.getElementById('display-credits').innerText = credits;
                }
            }
        });
    });

    loadProfileData();
});

// --- INITIALIZATION ---
function init() {
    setupEventListeners();
    setupNavigation();
    setupBurgerMenu();
    updateLoginButton(currentUserName, token);
    checkPaymentStatus();

    if (token) {
        updateUIState(true, {
            name: currentUserName,
            email: currentUserEmail,
            avatar: currentUserAvatar
        });
        
        fetchUserData();
        updateNotificationsBadge();
        initGlobalSockets();
    } else {
        updateUIState(false);
    }

    const observerOptions = {
        threshold: 0.1, 
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-active');
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', init);