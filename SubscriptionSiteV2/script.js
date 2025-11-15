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

// Current product for ordering
let currentProduct = null;

// Initialize the website
function init() {
loadProducts();
setupEventListeners();
setupNavigation();
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
</div>
`;
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
loginBtn.addEventListener('click', openLoginModal);
closeOrder.addEventListener('click', closeOrderModal);
closeLogin.addEventListener('click', closeLoginModal);

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

    // Close modals when clicking outside
window.addEventListener('click', (e) => {
if (e.target === orderModal) closeOrderModal();
if (e.target === loginModal) closeLoginModal();
});
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

function handleLoginSubmit(e) {
e.preventDefault();
    
const email = document.getElementById('email').value;
const password = document.getElementById('password').value;

    // validate credentials with a server
console.log('Login attempt:', { email, password });
    
    // Simulate successful login
alert(`Welcome back! You've been logged in successfully.`);
closeLoginModal();
    
    //  login button
loginBtn.innerHTML = '<i class="fas fa-user"></i> My Account';
}

function handleSignupSubmit(e) {
e.preventDefault();
    
formData = {
name: document.getElementById('signupName').value,
email: document.getElementById('signupEmail').value,
password: document.getElementById('signupPassword').value
};

// send data to a server
console.log('Signup attempt:', formData);
    
// Simulate successful signup
alert(`Welcome, ${formData.name}! Your account has been created successfully.`);
closeLoginModal();
    
// Update login button
loginBtn.innerHTML = '<i class="fas fa-user"></i> My Account';
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