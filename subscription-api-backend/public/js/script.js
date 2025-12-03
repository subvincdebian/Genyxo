const products = [
    { id: 1, price: "$1.50", image: "./images/startai.jpg" },
    { id: 2, price: "$2.00", image: "./images/aiexplorer.jpg" },
    { id: 3, price: "$3.50", image: "./images/procreatorai.jpg" },
    { id: 4, price: "$7.00", image: "./images/aimaster.jpg" },
    { id: 5, price: "$12.00", image: "./images/unlimitedpower.jpg" },
    { id: 6, price: "$25.00", image: "./images/aititan.jpg" },
];

// Вкажіть вашу реальну адресу на Railway
const API_BASE_URL = 'https://genyxo.com/' || 'https://hostaisite-production.up.railway.app';
let authToken = localStorage.getItem('authToken') || null;
let currentUserName = localStorage.getItem('userName') || 'My Profile';
let currentProduct = null;

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


// --- INITIALIZATION ---
function init() {
    setupEventListeners();
    setupNavigation();
    updateLoginButton(currentUserName, authToken);

    if (authToken) {
        fetchUserData();
    }
}

// --- CHECKOUT LOGIC (НОВА) ---

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
            alert(`Error: ${data.message || 'Failed to create payment'}`);
            payBtn.classList.remove('loading');
            payBtn.disabled = false;
        }
    } catch (error) {
        console.error(error);
        alert('Connection error. Please try again.');
        payBtn.classList.remove('loading');
        payBtn.disabled = false;
    }
}

// --- PRODUCTS GRID ---
function loadProducts() {
    if (!productsGrid) return;
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
            updateUserUI(user);
            updateNotificationsBadge();
        } else {
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
            await fetchUserData();
            closeLoginModal();
        } else {
            alert(`Login Error: ${data.message}`);
        }
    } catch (error) {
        alert('Server connection failed.');
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Error: Passwords do not match!');
        return;
    }

    const formData = {
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        password: password
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
            await fetchUserData();
            closeLoginModal();
        } else {
            alert(`Register Error: ${data.message}`);
        }
    } catch (error) {
        alert('Server connection failed.');
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
    authToken = null;
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
    loginBtn.addEventListener('click', handleLoginButtonClick);
    closeLogin.addEventListener('click', closeLoginModal);
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

    loginForm.addEventListener('submit', handleLoginSubmit);
    signupForm.addEventListener('submit', handleSignupSubmit);
    showSignup.addEventListener('click', (e) => { e.preventDefault(); showSignupForm(); });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    searchInput.addEventListener('input', handleSearch);
    exploreBtn.addEventListener('click', () => document.getElementById('products').scrollIntoView({ behavior: 'smooth' }));

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
document.addEventListener('DOMContentLoaded', init);
