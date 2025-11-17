const products = [
    {
        id: 1,
        name: " Супер АІ",
        price: "$49.99",
        character: "Naruto",
        image: "aiproductbanner.jpg" 
    },
    {
        id: 2,
        name: "Ігрові Підписки",
        price: "$54.99",
        character: "Sailor Moon",
        image: "XB-PS-Switch-IL.jpg" 
    },
    {
        id: 3,
        name: "Apple One",
        price: "$59.99",
        character: "Goku",
        image: "apple-one-2.webp" 
    },
    {
        id: 4,
        name: "Telegram Premium",
        price: "$52.99",
        character: "Eren Yeager",
        image: "tgpremium.jpg" 
    },
    {
        id: 5,
        name: "Discord Nitro",
        price: "$56.99",
        character: "All Might",
        image: "discordnitro.webp" 
    },
    {
        id: 6,
        name: "Музикальні Підписки",
        price: "$51.99",
        character: "Nezuko",
        image: "musicsubscriptions.jpg" 
    }
];

const API_BASE_URL = 'http://localhost:3000'; 
let authToken = localStorage.getItem('authToken') || null;
let currentUserName = localStorage.getItem('userName') || 'Мій Кабінет';

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const orderModal = document.getElementById('orderModal');
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
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
const loginBtnText = loginBtn.querySelector('span');

// Current product for ordering
let currentProduct = null;

// Initialize the website
function init() {
    loadProducts();
    setupEventListeners();
    setupNavigation();
    updateLoginButton(currentUserName, authToken);
}

function updateLoginButton(name, token) {
    if (token) {
        loginBtnText.textContent = name;
    } else {
        loginBtnText.textContent = 'Зареєструватись / Увійти';
    }
}

// Load products into the grid
function loadProducts() {
    productsGrid.innerHTML = '';
        
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
            <img src="${product.image}" alt="${product.name}" onerror="this.src='placeholder.jpg'">
            </div>
            <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">${product.price}</div>
            <button class="buy-btn" data-id="${product.id}">
            Buy Now
            </button>
            </div>`;
        productsGrid.appendChild(productCard);
        }
    );

    // Add event listeners to buy buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            currentProduct = products.find(p => p.id === productId);
            openOrderModal();
        })}
    );
}

// Setup
function setupEventListeners() {
    // Modal open/close
    loginBtn.addEventListener('click', handleLoginButtonClick);
    closeOrder.addEventListener('click', closeOrderModal);
    closeLogin.addEventListener('click', closeLoginModal);
    
    dropdownLogoutBtn.addEventListener('click', handleLogout); 

    // submissions
    orderForm.addEventListener('submit', handleOrderSubmit);
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
        if (e.target === orderModal) closeOrderModal();
        if (e.target === loginModal) closeLoginModal();
        
        if (!e.target.closest('#loginBtn')) {
            if (profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        }
    });
}

function handleLoginButtonClick(e) {
    e.stopPropagation();
    
    if (authToken) {
        profileDropdown.classList.toggle('show');
    } else {
        openLoginModal();
    }
}

// Setup navigation
function setupNavigation() {
    navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);

    // Remove active class from all links
    navLinks.forEach(l => l.classList.remove('active'));
    // Add active class to clicked link
    link.classList.add('active');

    if (targetId === 'home' || targetId === 'products' || targetId === 'about') {
    document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
    }
    });
    });
}

// Modal functions
function openOrderModal() {
    orderModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
    orderModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    orderForm.reset();
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

// Form handlers
function handleOrderSubmit(e) {
    e.preventDefault();
        
    const formData = {
        product: currentProduct.name,
        fullName: document.getElementById('fullName').value,
        nickname: document.getElementById('nickname').value,
        phone: document.getElementById('phone').value,
        city: document.getElementById('city').value,
        address: document.getElementById('address').value,
        delivery: document.querySelector('input[name="delivery"]:checked').value
    };

    // send data to a server 'no server available actually'
    console.log('Order submitted:', formData);
        
    // Show success message
    alert(`Thank you, ${formData.nickname}! Your order for "${formData.product}" has been placed successfully!`);
        
    closeOrderModal();
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
            // Успішний вхід: зберігаємо токен і оновлюємо UI
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userName', data.user.name || 'Мій Кабінет');
            authToken = data.access_token;
            currentUserName = data.user.name || 'Мій Кабінет';

            alert(`З поверненням! Ви успішно увійшли.`);
            updateLoginButton(currentUserName, authToken);
            closeLoginModal();
        } else {
            // Помилка (наприклад, неправильний пароль)
            const errorMessage = data.message || 'Неправильний email або пароль.';
            alert(`Помилка входу: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Network or server error:', error);
        alert('Помилка підключення до сервера. Перевірте, чи запущено бек-енд.');
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    
    // Перевірка відповідності паролів
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Помилка: Паролі не збігаються!');
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
            // Успішна реєстрація: зберігаємо токен і оновлюємо UI
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userName', data.user.name || 'Мій Кабінет');
            authToken = data.access_token;
            currentUserName = data.user.name || 'Мій Кабінет';

            alert(`Ласкаво просимо, ${currentUserName}! Ваш обліковий запис успішно створено.`);
            updateLoginButton(currentUserName, authToken);
            closeLoginModal();
        } else {
            // Помилка (наприклад, email вже зайнятий)
            const errorMessage = data.message || 'Невідома помилка реєстрації.';
            alert(`Помилка реєстрації: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Network or server error:', error);
        alert('Помилка підключення до сервера. Перевірте, чи запущено бек-енд.');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    authToken = null;
    currentUserName = 'Мій Кабінет';
    
    alert('Ви успішно вийшли.');
    
    updateLoginButton(currentUserName, authToken);
    profileDropdown.classList.remove('show'); 
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
        
    if (searchTerm.length === 0) {
        loadProducts();
        return;
    }

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.character.toLowerCase().includes(searchTerm)
    );

    productsGrid.innerHTML = '';
        
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
        <div class="no-results glass" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
        <h3>No products found</h3>
        <p>Try searching for different anime characters</p>
        </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
        <div class="product-image">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='placeholder.jpg'">
        </div>
        <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-price">${product.price}</div>
        <button class="buy-btn" data-id="${product.id}">
        Buy Now
        </button>
        </div>
        `;
        productsGrid.appendChild(productCard);
    });

    // Re-add event listeners to filtered products
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
