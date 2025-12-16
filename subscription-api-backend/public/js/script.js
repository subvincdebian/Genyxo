const API_BASE_URL = 'https://genyxo.com';
let authToken = localStorage.getItem('authToken') || null;
let currentUserName = localStorage.getItem('userName') || 'My Profile';
let currentUserEmail = localStorage.getItem('userEmail');
let currentUserAvatar = localStorage.getItem('userAvatar');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Перевірка чи повернулися ми з Google Auth
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        localStorage.setItem('authToken', token);
        // Очистити URL
        window.history.replaceState({}, document.title, "/");
        updateAuthUI();
        showToast('Successfully logged in with Google!', 'success');
    }
});

let currentProduct = null;

const products = [
    { id: 1, price: "$1.50", image: "./images/startai.jpg" },
    { id: 2, price: "$2.00", image: "./images/aiexplorer.jpg" },
    { id: 3, price: "$3.50", image: "./images/procreatorai.jpg" },
    { id: 4, price: "$7.00", image: "./images/aimaster.jpg" },
    { id: 5, price: "$12.00", image: "./images/unlimitedpower.jpg" },
    { id: 6, price: "$25.00", image: "./images/aititan.jpg" },
];

// --- DOM Elements ---
const productsGrid = document.getElementById('productsGrid');

// Login / Profile Elements
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const closeLogin = document.getElementById('closeLogin');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const logoutContainer = document.getElementById('logoutContainer');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');

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

// Checkout Elements (НОВІ)
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckout');
const payBtn = document.getElementById('payBtn'); // Кнопка "Proceed to Payment"

// Search & Nav
const searchInput = document.querySelector('.search-input');
const exploreBtn = document.getElementById('exploreBtn');
const navLinks = document.querySelectorAll('.nav-link');

const urlParams = new URLSearchParams(window.location.search);
const refId = urlParams.get('ref');

if (refId) {
    localStorage.setItem('referrerId', refId);
    console.log('Referrer ID saved:', refId);
}


// --- INITIALIZATION ---
function init() {
    setupEventListeners();
    setupNavigation();
    setupBurgerMenu();
    updateLoginButton(currentUserName, authToken);
    checkPaymentStatus();

    if (authToken) {
        updateUIState(true, {
            name: currentUserName,
            email: currentUserEmail,
            avatar: currentUserAvatar
        });
        
        fetchUserData(); 
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

function updateUIState(isLoggedIn, userData = null) {
    if (isLoggedIn && userData) {
        // Кнопка навігації
        if (navUsername) navUsername.textContent = userData.name || userData.email || 'User';
        if (navIcon) navIcon.style.display = 'none';
        
        if (navAvatar) {
            navAvatar.style.display = 'block';
            // Якщо аватарки немає - дефолтна (Dicebear)
            navAvatar.src = userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name || 'User'}`;
        }

        // Меню профілю
        if (menuName) menuName.textContent = userData.name || 'User';
        if (menuEmail) menuEmail.textContent = userData.email || '';
        
        // Аватарка в меню
        if (dropdownAvatars) {
            dropdownAvatars.forEach(img => {
                img.src = userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name || 'User'}`;
            });
        }
        
        // Кредити (якщо передані, інакше чекаємо fetch)
        if (userData.credits !== undefined && menuCredits) {
             menuCredits.textContent = parseFloat(userData.credits).toLocaleString();
        }

        // Клас кнопки (щоб працював дропдаун)
        if (loginBtn) {
            loginBtn.classList.add('login-btn');
        }
        loginBtn.classList.add('profile-toggle-btn');
    } else {
        // Стан "Гість"
        if (navUsername) navUsername.textContent = 'Register / Login';
        if (navIcon) navIcon.style.display = 'inline-block';
        if (navAvatar) navAvatar.style.display = 'none';
        
        if (loginBtn) {
            loginBtn.classList.add('login-btn');
        }
        loginBtn.classList.remove('profile-toggle-btn');
        
        if (profilePanel) profilePanel.classList.remove('show');
    }
}

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }

    // Іконки
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

    // trigger slide-in animation immediately
    // use requestAnimationFrame to ensure the element is in DOM
    requestAnimationFrame(() => {
        toast.style.animation = 'slideInToast 0.3s forwards';
    });

    // schedule hiding
    const hideMs = Number(duration) || 3000;
    const hideAnimMs = 300; // should match .toast.hiding animation duration

    const hideTimer = setTimeout(() => {
        // clear any inline animation so CSS .hiding animation can run
        toast.style.animation = '';
        // force reflow to ensure the change is applied
        void toast.offsetWidth;

        // add hiding class to trigger slideOut animation (defined in CSS)
        toast.classList.add('hiding');

        // fallback: ensure removal after animation even if animationend doesn't fire
        const removeFallback = setTimeout(() => {
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
        }, hideAnimMs + 50);

        // remove on animationend as well
        toast.addEventListener('animationend', function onAnim(e) {
            // ensure the event is for the hiding animation (transform/opacity)
            if (e.target !== toast) return;
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            clearTimeout(removeFallback);
            toast.removeEventListener('animationend', onAnim);
        });
    }, hideMs);

    // return an object to allow manual clear if needed
    return {
        hideTimer,
        element: toast
    };
}

function checkPaymentStatus() {
    if (window.location.hash === '#success') {
        // Очищаємо хеш, щоб при перезавантаженні не стріляло знову
        history.pushState("", document.title, window.location.pathname + window.location.search);
        
        const msg = window.i18n?.translations?.toasts?.payment_success || 'Payment successful!';
        showToast(msg, 'Payment successful! Credits added.', 'success');
        
        // Запуск конфетті
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

// 1. Відкриття вікна
function openCheckout(product) {
    currentProduct = product;
    
    // Якщо не залогінений - просимо увійти
    if (!authToken) {
        openLoginModal();
        return;
    }

    // Отримуємо переклади або ставимо заглушки
    const productTrans = (window.i18n && i18n.translations.products_data && i18n.translations.products_data[product.id]) 
                         ? i18n.translations.products_data[product.id] 
                         : { name: 'AI Pack', credits_label: 'Credits' };

    // Заповнюємо дані в HTML
    document.getElementById('checkoutImg').src = product.image;
    document.getElementById('checkoutName').textContent = productTrans.name;
    // Витягуємо тільки цифри для бейджа
    document.getElementById('checkoutCredits').textContent = productTrans.credits_label.replace(/\D/g, ''); 
    document.getElementById('checkoutPrice').textContent = product.price;
    document.getElementById('checkoutTotal').textContent = product.price;

    // Показуємо модалку
    checkoutModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Блокуємо скрол фону
}

// 2. Логіка оплати (Перехід на NowPayments)
async function processPayment() {
    if (!authToken || !currentProduct) return;

    // Анімація завантаження
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
            // 🔥 ПЕРЕАДРЕСАЦІЯ НА ОПЛАТУ
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

// --- PRODUCTS GRID ---
function loadProducts() {
    if (!productsGrid) {
        console.error("Element with ID 'productsGrid' not found!");
        return;
    }

    productsGrid.innerHTML = '';
    
    // Перевірка наявності перекладів
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

        const productCard = document.createElement('div');
        productCard.className = 'product-card glass';

        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${productTrans.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Product'">
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

    // 🔥 ВАЖЛИВО: Підключаємо нову функцію openCheckout
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Знаходимо ID і відкриваємо НОВЕ вікно
            const btnElement = e.target.closest('.buy-btn'); // Захист від кліку по тексту всередині кнопки
            const productId = parseInt(btnElement.getAttribute('data-id'));
            const product = products.find(p => p.id === productId);
            openCheckout(product);
        });
    });
}

// --- USER & PROFILE ---
async function fetchUserData() {
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

            if (document.getElementById('affiliateBalance')) {
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

function updateUserUI(user) {
    if (navUsername) navUsername.textContent = user.name || user.email;
    
    if (user.avatar) {
        if(navIcon) navIcon.style.display = 'none';
        if(navAvatar) {
            navAvatar.style.display = 'block';
            navAvatar.src = user.avatar;
        }
        dropdownAvatars.forEach(img => img.src = user.avatar);
    } else {
        dropdownAvatars.forEach(img => img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.name || 'User'));
    }

    if (menuName) menuName.textContent = user.name || 'User';
    if (menuEmail) menuEmail.textContent = user.email;
    if (menuCredits) menuCredits.textContent = (user.credits || 0).toLocaleString();
}

async function updateNotificationsBadge() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            if (notificationBadge) {
                if (data.count > 0) {
                    notificationBadge.style.display = 'inline-block';
                    notificationBadge.textContent = data.count > 99 ? '99+' : data.count;
                } else {
                    notificationBadge.style.display = 'none';
                }
            }
        }
    } catch (e) { console.error(e); }
}

// --- AUTH HANDLERS ---
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

// --- UI HELPERS ---
function handleLoginButtonClick(e) {
    e.stopPropagation();
    if (authToken) {
        profilePanel.classList.toggle('show');
    } else {
        openLoginModal();
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

function updateLoginButton(name, token) {
    if (token) {
        navUsername.textContent = name;
        navIcon.style.display = 'none'; 
        navAvatar.style.display = 'block'; 
    } else {
        navUsername.textContent = 'Register / Login';
        navIcon.style.display = 'inline-block';
        navAvatar.style.display = 'none';
        profilePanel.classList.remove('show');
    }
}

function openLoginModal() {
    loginModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    logoutContainer.style.display = 'none';
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

function showLoginForm() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
}

// Search
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

    // Рендер відфільтрованих (копія коду з loadProducts)
    filteredProducts.forEach(product => {
        const productTrans = translations[product.id.toString()];
        const featuresHtml = productTrans.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('');
        
        const card = document.createElement('div');
        card.className = 'product-card glass';
        card.innerHTML = `
            <div class="product-image"><img src="${product.image}"></div>
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

// --- EVENT LISTENERS ---
function setupEventListeners() {
    if (loginBtn)
        loginBtn.addEventListener('click', handleLoginButtonClick);

    if (closeLogin)
        closeLogin.addEventListener('click', closeLoginModal);

    if (dropdownLogoutBtn)
        dropdownLogoutBtn.addEventListener('click', handleLogout);
    
    // 🔥 ЗАКРИТТЯ НОВОГО ВІКНА
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', () => {
            checkoutModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            payBtn.classList.remove('loading');
            payBtn.disabled = false;
        });
    }

    if (loginForm)
        loginForm.addEventListener('submit', handleLoginSubmit);

    if (signupForm)
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;

            try {
                const res = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    // Показуємо красиву помилку (наприклад, з class-validator)
                    let errorMsg = data.message;
                    if (Array.isArray(data.message)) errorMsg = data.message.join('<br>');
                    showToast(errorMsg || 'Registration failed', 'error');
                } else {
                    signupForm.reset();
                    // Показуємо користувачу, що треба перевірити пошту
                    alert('Account created! Please check your email to verify your account before logging in.');
                    // Перемикаємо на логін
                    signupForm.style.display = 'none';
                    loginForm.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                showToast('Server error', 'error');
            }
        });

    if (showSignup)
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });

    if (showLogin)
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });

    if (searchInput)
        searchInput.addEventListener('input', handleSearch);

    if (exploreBtn)
        exploreBtn.addEventListener('click', () => {
            const products = document.getElementById('products');
            if (products) products.scrollIntoView({ behavior: 'smooth' });
        });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-container') && profilePanel.classList.contains('show')) {
            profilePanel.classList.remove('show');
        }
        // Закриття checkout по кліку на фон
        if (e.target === checkoutModal) {
            checkoutModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
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

// Initialize when DOM is loaded
// Burger / Mobile menu setup
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

    // Close menu when clicking a mobile link
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close when clicking overlay
    overlay.addEventListener('click', closeMenu);
}

async function loadAffiliateData() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;

    // Перевіряємо, чи існує блок на сторінці
    const balanceElement = document.getElementById('affiliateBalance');
    if (!balanceElement) return;

    try {
        const response = await fetch(`${API_BASE_URL}/profile/affiliate`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json(); // Отримуємо об'єкт даних
            
            // 1. Оновлюємо баланс (ID з HTML: affiliateBalance)
            // Якщо баланс прийшов як рядок, конвертуємо, якщо число - форматуємо
            const rawBalance = parseFloat(data.balance || 0);
            balanceElement.textContent = rawBalance.toFixed(2);

            // 2. Оновлюємо лічильник запрошених (ID з HTML: invitedCount)
            const invitedElement = document.getElementById('invitedCount');
            if (invitedElement) {
                invitedElement.textContent = data.invitedCount || 0;
            }
            
            // 3. Вставляємо посилання (ID з HTML: referralLinkInput)
            const linkInput = document.getElementById('referralLinkInput');
            if (linkInput) {
                linkInput.value = data.referralLink || 'Error generating link';
            }

        } else {
            console.warn('Failed to load affiliate stats');
        }
    } catch (e) {
        console.error("Affiliate load error:", e);
    }
}

const copyAffBtn = document.getElementById('copyAffBtn');
if (copyAffBtn) {
    copyAffBtn.addEventListener('click', () => {
        // ID з HTML: referralLinkInput (було affLinkInput)
        const input = document.getElementById('referralLinkInput');
        if (input && input.value) {
            input.select();
            input.setSelectionRange(0, 99999); // Для мобільних
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Referral link copied!', 'success');
            }).catch(err => {
                console.error('Copy failed', err);
                // Фолбек, якщо clipboard API не працює
                document.execCommand('copy'); 
                showToast('Link copied!', 'success');
            });
        }
    });
}

function requestPayout() {
    const balance = parseFloat(document.getElementById('affBalance').innerText);
    if (balance < 10) {
        showToast('Minimum withdrawal amount is $10.00', 'error');
        return;
    }
    // Тут можна зробити реальний запит на бекенд
    if(confirm(`Request payout of $${balance}? Support will contact you via email.`)) {
         showToast('Request sent! Support will contact you shortly.', 'success');
    }
}

document.addEventListener('DOMContentLoaded', init);
