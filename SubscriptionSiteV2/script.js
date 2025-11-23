const products = [
    {
        id: 1,
        name: "Start AI",
        price: "$1.50",
        image: "startai.jpg",
        credits: "500 credits",
        features: [
            "Access to basic AI models",
            "Standard support",
            "Lifetime validity"
        ]
    },
    {
        id: 2,
        name: "AI Explorer",
        price: "$2.00",
        image: "aiexplorer.jpg",
        credits: "1,000 credits",
        features: [
            "Access to advanced AI models",
            "Priority support",
            "Lifetime validity"
        ]
    },
    {
        id: 3,
        name: "Pro Creator",
        price: "$3.50",
        image: "procreatorai.jpg",
        credits: "2,000 credits",
        features: [
            "All AI models included",
            "VIP support",
            "Lifetime validity"
        ]
    },
    {
        id: 4,
        name: "AI Master",
        price: "$7.00",
        image: "aimaster.jpg",
        credits: "5,000 credits",
        features: [
            "All AI models",
            "24/7 Premium support",
            "Lifetime validity"
        ]
    },
    {
        id: 5,
        name: "Unlimited Power",
        price: "$12.00",
        image: "unlimitedpower.jpg",
        credits: "10,000 credits",
        features: [
            "All features",
            "Dedicated support manager",
            "Lifetime validity"
        ]
    },
    {
        id: 6,
        name: "AI Titan",
        price: "$25.00",
        image: "aititan.jpg",
        credits: "25,000 credits",
        features: [
            "Unlimited everything",
            "White-label options",
            "Lifetime validity"
        ]
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
const loginBtnText = loginBtn.querySelector('span');
const paymentMethodSelect = document.getElementById('paymentMethod');
const manualPaymentModal = document.getElementById('manualPaymentModal');
const closeManualPaymentBtn = document.getElementById('closeManualPayment');

const profilePanel = document.getElementById('profilePanel');
const navUsername = document.getElementById('navUsername');
const navAvatar = document.getElementById('navAvatar');
const navIcon = document.getElementById('navIcon');

const menuName = document.getElementById('menuName');
const menuEmail = document.getElementById('menuEmail');
const menuCredits = document.getElementById('menuCredits');
const dropdownAvatars = document.querySelectorAll('.dropdown-avatar');

const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');

// Setup Listeners
closeManualPaymentBtn.addEventListener('click', closeManualPaymentModal);

// Current product for ordering
let currentProduct = null;

// Initialize the website
function init() {
    loadProducts();
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

// Обробник кліку на кнопку профілю
function handleLoginButtonClick(e) {
    e.stopPropagation();
    if (authToken) {
        // Тоггл меню
        profilePanel.classList.toggle('show'); // Додай стиль .show { display: block; } у CSS якщо ще немає
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

function closeManualPaymentModal() {
    manualPaymentModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Load products into the grid
function loadProducts() {
    productsGrid.innerHTML = '';
        
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Генеруємо HTML списку фіч
        const featuresHtml = product.features.map(feature => `
            <li>
                <span class="feature-icon"><i class="fas fa-check"></i></span>
                ${feature}
            </li>
        `).join('');

        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${product.name}'">
            </div>
            
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">${product.price}</div>
                
                <ul class="product-features">
                    <li>
                        <span class="feature-icon icon-bolt"><i class="fas fa-bolt"></i></span>
                        ${product.credits}
                    </li>
                    ${featuresHtml}
                </ul>

                <button class="buy-btn" data-id="${product.id}">
                    Buy Now
                </button>
            </div>`;
        productsGrid.appendChild(productCard);
    });

    // Add event listeners to buy buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            currentProduct = products.find(p => p.id === productId);
            openOrderModal();
        });
    });
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
async function handleOrderSubmit(e) {
    e.preventDefault();
    if (!authToken) { alert('Log in'); return; }
    
    const selectedMethod = document.getElementById('paymentMethod').value;

    try {
        const response = await fetch(`${API_BASE_URL}/payment/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                packId: currentProduct.id,
                paymentMethod: selectedMethod
            })
        });

        const data = await response.json();

        if (response.ok && data.status === 'manual_pending') {
            closeOrderModal();
            showPaymentWindow(data.instructions, data.orderId);
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error(error);
        alert('Server Error');
    }
}

let currentOrderId = null;

function showPaymentWindow(instr, orderId) {
    currentOrderId = orderId;
    const modal = document.getElementById('manualPaymentModal');
    
    document.getElementById('paymentTitle').innerText = instr.currency === 'USDT' ? 'Crypto payment' : 'Payment by card';
    
    // Показуємо або Гаманець, або Номер карти
    const target = instr.address || instr.number;
    document.getElementById('paymentTarget').innerText = target;
    document.getElementById('paymentAmount').innerText = instr.amount;
    document.getElementById('paymentNetwork').innerText = instr.network || instr.holder;
    
    // Очищаємо поле вводу
    document.getElementById('paymentProof').value = '';
    
    modal.style.display = 'flex';
}

function confirmManualPayment() {
    const proof = document.getElementById('paymentProof').value;
    if (proof.length < 4) {
        alert('Please enter confirmation (Transaction hash or time)');
        return;
    }

    // Тут можна відправити proof на сервер, щоб зберегти його (опціонально)
    // Але для MVP достатньо просто повідомити клієнта
    
    alert(`Thank you! Order #${currentOrderId} accepted for processing. We will verify the payment (${proof}) and we will accrue credits within 20 minutes.`);
    
    document.getElementById('manualPaymentModal').style.display = 'none';
}

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
        
    if (searchTerm.length === 0) {
        loadProducts();
        return;
    }

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
    );

    productsGrid.innerHTML = '';
        
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
        <div class="no-results glass" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
            <h3>No products found</h3>
            <p>Try searching for different product</p>
        </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Той самий генератор HTML, що і в loadProducts
        const featuresHtml = product.features.map(feature => `
            <li><span class="feature-icon"><i class="fas fa-check"></i></span>${feature}</li>
        `).join('');

        productCard.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${product.name}'">
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">${product.price}</div>
            
            <ul class="product-features">
                <li><span class="feature-icon icon-bolt"><i class="fas fa-bolt"></i></span>${product.credits}</li>
                ${featuresHtml}
            </ul>

            <button class="buy-btn" data-id="${product.id}">Buy Now</button>
        </div>
        `;
        productsGrid.appendChild(productCard);
    });

    // Re-add event listeners
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
