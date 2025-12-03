const products = [
    {
        id: 1,
        price: "$1.50",
        image: "./images/startai.jpg",
    },
    {
        id: 2,
        price: "$2.00",
        image: "./images/aiexplorer.jpg",
    },
    {
        id: 3,
        price: "$3.50",
        image: "./images/procreatorai.jpg",
    },
    {
        id: 4,
        price: "$7.00",
        image: "./images/aimaster.jpg",
    },
    {
        id: 5,
        price: "$12.00",
        image: "./images/unlimitedpower.jpg",
    },
    {
        id: 6,
        price: "$25.00",
        image: "./images/aititan.jpg",
    },
]

const API_BASE_URL = 'https://hostaisite-production.up.railway.app';
let authToken = localStorage.getItem('authToken') || null;
let currentUserName = localStorage.getItem('userName') || 'My Profile';

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const closeOrder = document.getElementById('closeOrder');
const closeLogin = document.getElementById('closeLogin');
const orderForm = document.getElementById('orderForm');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const searchInput = document.querySelector('.search-input');
const exploreBtn = document.getElementById('exploreBtn');
const navLinks = document.querySelectorAll('.nav-link');
const logoutContainer = document.getElementById('logoutContainer');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');
const profileDropdown = document.getElementById('profileDropdown');
const loginBtnText = loginBtn.querySelector('span');
const manualPaymentModal = document.getElementById('manualPaymentModal');

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

const payButton = document.getElementById('payButton');

const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckout');
const payBtn = document.getElementById('payBtn');

// Current product for ordering
let currentProduct = null;

// Initialize the website
function init() {
    setupEventListeners();
    setupNavigation();
    updateLoginButton(currentUserName, authToken);

    if (authToken) {
        fetchUserData();
    }
}

async function fetchUserData() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            console.log("User data received:", user);
            updateUserUI(user);
            updateNotificationsBadge();
        } else {
            console.log('Token invalid');
            handleLogout();
        }
    } catch (e) {
        console.error("Loading Profile Error:", e);
    }
}

function updateUserUI(user) {
    // 1. Оновлюємо кнопку навігації
    if (navUsername) navUsername.textContent = user.name || user.email;
    
    // Логіка аватарки (в кнопці і в меню)
    if (user.avatar) {
        if(navIcon) navIcon.style.display = 'none';
        if(navAvatar) {
            navAvatar.style.display = 'block';
            navAvatar.src = user.avatar;
        }
        // Оновлюємо велику аватарку в меню
        dropdownAvatars.forEach(img => img.src = user.avatar);
    } else {
        // Якщо аватарки немає - ставимо дефолтну
        dropdownAvatars.forEach(img => img.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y');
    }

    // 2. Оновлюємо текст у випадаючому меню
    if (menuName) menuName.textContent = user.name || 'User';
    if (menuEmail) menuEmail.textContent = user.email;
    if (menuCredits) menuCredits.textContent = user.credits || 0;
}

if (closeCheckoutBtn) {
    closeCheckoutBtn.addEventListener('click', () => {
        checkoutModal.style.display = 'none';
        payBtn.classList.remove('loading');
        payBtn.disabled = false;
    });
}

// Обробник кліку на кнопку профілю
function handleLoginButtonClick(e) {
    e.stopPropagation();
    if (authToken) {
        // Тоггл меню
        profilePanel.classList.toggle('show'); // Додай стиль .show { display: block; } у CSS якщо ще немає
        document.querySelector('.profile-container').classList.toggle('active');
    } else {
        openLoginModal();
    }
}

// Вихід
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    authToken = null;
    
    // Скидаємо UI
    if(navUsername) navUsername.textContent = 'Register / Login';
    if(navIcon) navIcon.style.display = 'inline-block';
    if(navAvatar) navAvatar.style.display = 'none';
    if(profilePanel) profilePanel.classList.remove('show');
    
    window.location.reload();
}

function updateLoginButton(name, token) {
    if (token) {
        // Стан: ЗАЛОГІНЕНИЙ
        navUsername.textContent = name;
        navIcon.style.display = 'none'; 
        navAvatar.style.display = 'block'; 
        
        menuName.textContent = name;
        menuEmail.textContent = localStorage.getItem('userEmail') || 'user@example.com';
    } else {
        // Стан: ГІСТЬ
        navUsername.textContent = 'Зареєструватись / Увійти';
        navIcon.style.display = 'inline-block';
        navAvatar.style.display = 'none';
        profilePanel.classList.remove('show');
    }
}

function openCheckout(product) {
    currentProduct = product;
    
    // Якщо не залогінений - просимо увійти
    if (!authToken) {
        openLoginModal();
        return;
    }

    // Заповнюємо дані (безпечно з перекладів)
    const productTrans = (window.i18n && i18n.translations.products_data[product.id]) 
                         ? i18n.translations.products_data[product.id] 
                         : { name: 'Product', credits_label: 'Credits' };

    document.getElementById('checkoutImg').src = product.image;
    document.getElementById('checkoutName').textContent = productTrans.name;
    document.getElementById('checkoutCredits').textContent = productTrans.credits_label.replace(/\D/g, ''); // Тільки цифри
    document.getElementById('checkoutPrice').textContent = product.price;
    document.getElementById('checkoutTotal').textContent = product.price;

    // Відкриваємо вікно
    checkoutModal.style.display = 'flex';
}

// 2. Логіка кнопки "Pay Now"
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
            // 🔥 ПЕРЕАДРЕСАЦІЯ НА NOWPAYMENTS
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

async function updateNotificationsBadge() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            const count = data.count;

            if (notificationBadge) {
                if (count > 0) {
                    notificationBadge.style.display = 'inline-block';
                    notificationBadge.textContent = count > 99 ? '99+' : count;
                } else {
                    notificationBadge.style.display = 'none';
                }
            }
        }
    } catch (e) {
        console.error("Error checking notifications:", e);
    }
}

// Load products into the grid
function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    
    if (!window.i18n || !window.i18n.translations || !window.i18n.translations.products_data) {
        console.warn("Localization data not fully loaded yet. Skipping product rendering.");
        return; 
    }
    
    const translations = window.i18n.translations.products_data;

    products.forEach(product => {
        const productTrans = translations[product.id.toString()]; 
        if (!productTrans) {
            console.error(`Missing translation data for product ID: ${product.id}`);
            return;
        }
        
        const featuresHtml = productTrans.features.map(feature => `
            <li>
                <span class="feature-icon"><i class="fas fa-check"></i></span>
                ${feature}
            </li>
        `).join('');

        const productCard = document.createElement('div');
        productCard.className = 'product-card glass';

        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${productTrans.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${productTrans.name}'">
            </div>
            
            <div class="product-info">
                <h3 class="product-name">${productTrans.name}</h3>
                <div class="product-price">${product.price}</div>
                
                <ul class="product-features">
                    <li>
                        <span class="feature-icon icon-bolt"><i class="fas fa-bolt"></i></span>
                        ${productTrans.credits_label} 
                    </li>
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
            const productId = parseInt(e.target.getAttribute('data-id'));
            const product = products.find(p => p.id === productId);
            openCheckout(product);
        });
    });
}

// Setup
function setupEventListeners() {
    // Modal open/close
    loginBtn.addEventListener('click', handleLoginButtonClick);
    closeLogin.addEventListener('click', closeLoginModal);
    
    dropdownLogoutBtn.addEventListener('click', handleLogout); 

    // submissions
    loginForm.addEventListener('submit', handleLoginSubmit);
    signupForm.addEventListener('submit', handleSignupSubmit);
     
    // switching
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Search functionality
    searchInput.addEventListener('input', handleSearch);

    // Explore btn
    exploreBtn.addEventListener('click', () => {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-container')) {
            if (profilePanel.classList.contains('show')) {
                profilePanel.classList.remove('show');
            }
        }
    });

    if(dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', handleLogout);
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

// Setup navigation
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href.startsWith('#')) {
                e.preventDefault();
                
                const targetId = href.substring(1);

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
            } 
            
            // 2. Обробка посилань на файли (chat.html)
            // Якщо href НЕ починається з '#', ми не викликаємо e.preventDefault(), 
            // тому браузер виконає стандартну дію і ПЕРЕЙДЕ на сторінку chat.html!
            
        });
    });
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
    showLoginForm();
}

function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
}

function showLoginForm() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
}

let currentOrderId = null;


document.getElementById('closeManualPayment').addEventListener('click', () => {
    document.getElementById('manualPaymentModal').style.display = 'none';
});

function showManualPaymentInstructions(instr) {
    document.getElementById('manualCardNumber').textContent = instr.card;
    document.getElementById('manualCardHolder').textContent = instr.holder;
    document.getElementById('manualAmount').textContent = `$${instr.amount}`;
    document.getElementById('manualOrderId').textContent = `Order #${instr.orderId}`;
    
    manualPaymentModal.style.display = 'flex';
}

async function submitOrder() {
    if (!authToken) {
        alert('Please log in to continue.');
        openLoginModal();
        return;
    }

    const btn = document.getElementById('payButton');
    
    // Вмикаємо анімацію завантаження
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/payment/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                packId: currentProduct.id
                // paymentMethod більше не потрібен, NowPayments сам розбереться
            })
        });

        const data = await response.json();

        if (response.ok && data.url) {
            // 🔥 ПЕРЕАДРЕСАЦІЯ НА NOWPAYMENTS
            window.location.href = data.url;
        } else {
            alert(`Error: ${data.message || 'Payment creation failed'}`);
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    } catch (error) {
        console.error(error);
        alert('Connection error. Please try again.');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            authToken = data.access_token;

            await fetchUserData();
            
            closeLoginModal();
        } else {
            const errorMessage = data.message || 'Incorrect email or password.';
            alert(`Login Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Network or server error:', error);
        alert('Server connection failed. Check if the backend is running.');
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            authToken = data.access_token;
            
            await fetchUserData();
            
            closeLoginModal();
        } else {
            const errorMessage = data.message || 'Unknown registration error.';
            alert(`Register Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Network or server error:', error);
        alert('Server connection failed. Check if the backend is running.');
    }
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    const productsGrid = document.getElementById('productsGrid');

    // Отримуємо об'єкт перекладів (як і в loadProducts)
    const translations = (window.i18n && i18n.translations && i18n.translations.products_data) 
                         ? i18n.translations.products_data 
                         : {}; 
                         
    // Якщо переклади не завантажені, ми не можемо шукати по назвах
    if (Object.keys(translations).length === 0) {
        productsGrid.innerHTML = `<div class="no-results glass" style="grid-column: 1/-1; text-align: center; padding: 2rem;"><h3>Loading translations...</h3></div>`;
        return;
    }

    // Фільтруємо продукти. Ми повинні шукати по ПЕРЕКЛАДЕНІЙ НАЗВІ.
    const filteredProducts = products.filter(product => {
        const productTrans = translations[product.id.toString()];
        return productTrans && productTrans.name.toLowerCase().includes(searchTerm);
    });

    productsGrid.innerHTML = '';
        
    if (filteredProducts.length === 0) {
        // У цьому місці теж можна використати переклад для "No products found"
        productsGrid.innerHTML = `
        <div class="no-results glass" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
            <h3>No products found</h3>
            <p>Try searching for different product</p>
        </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        // 1. Отримуємо переклади для знайденого продукту
        const productTrans = translations[product.id.toString()]; 
        if (!productTrans) return; // На випадок, якщо щось піде не так

        const productCard = document.createElement('div');
        productCard.className = 'product-card glass'; // Додав class="glass"
        
        // 2. Генеруємо HTML, використовуючи productTrans
        const featuresHtml = productTrans.features.map(feature => `
            <li><span class="feature-icon"><i class="fas fa-check"></i></span>${feature}</li>
        `).join('');

        productCard.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${productTrans.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${productTrans.name}'">
        </div>
        <div class="product-info">
            <h3 class="product-name">${productTrans.name}</h3>
            <div class="product-price">${product.price}</div>
            
            <ul class="product-features">
                <li><span class="feature-icon icon-bolt"><i class="fas fa-bolt"></i></span>${productTrans.credits_label}</li>
                ${featuresHtml}
            </ul>

            <button class="buy-btn" data-id="${product.id}">${translations.buy_now}</button>
        </div>
        `;
        productsGrid.appendChild(productCard);
    });

    // Re-add event listeners (залишаємо як є)
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            currentProduct = products.find(p => p.id === productId);
            openOrderModal();
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

const animatedElements = document.querySelectorAll(".animate-on-scroll");

function checkAnimations() {
    animatedElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            el.classList.add("animate-active");
        }
    });
}

window.addEventListener("scroll", checkAnimations);
window.addEventListener("load", checkAnimations);


const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");
const overlay = document.getElementById("menuOverlay"); // получаем overlay

function closeMenu() {
    burger.classList.remove("active");
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
}

burger.addEventListener("click", () => {
    burger.classList.toggle("active");
    mobileMenu.classList.toggle("active");
    overlay.classList.toggle("active");
});

// Закрытие меню при клике на ссылку
document.querySelectorAll(".mobile-menu a").forEach(link => {
    link.addEventListener("click", closeMenu);
});

// Закрытие при клике на overlay (пустая область вокруг меню)
overlay.addEventListener("click", closeMenu);


    document.getElementById('closeProfilePanel').addEventListener('click', () => {
    profilePanel.classList.remove('show');
    document.querySelector('.profile-container').classList.remove('active');
});
