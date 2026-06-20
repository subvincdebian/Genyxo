document.addEventListener('DOMContentLoaded', () => {
    const viewDemoBtns = document.querySelectorAll('.hero-btn, a[href="#demo"]');
    const openDemoBtn = document.getElementById('openDemoBtn');
    const modal = document.getElementById('demoChatModal');
    const closeBtn = document.getElementById('closeDemoBtn');
    const chatHistory = document.getElementById('demoChatHistory');
    const chatInput = document.getElementById('demoChatInput');
    const sendBtn = document.getElementById('demoSendBtn');
    const quickPrompts = document.getElementById('demoQuickPrompts');

    viewDemoBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) {
                modal.classList.add('active');
                setTimeout(() => { if (chatInput) chatInput.focus(); }, 100);
            }
        });
    });

    const closeModal = () => { modal.classList.remove('active'); };
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Керування станом кнопки відправки
    const toggleSendButtonState = () => {
        if (!chatInput || !sendBtn) return;
        if (chatInput.value.trim() === "") {
            sendBtn.style.opacity = "0.4";
            sendBtn.style.pointerEvents = "none";
        } else {
            sendBtn.style.opacity = "1";
            sendBtn.style.pointerEvents = "auto";
        }
    };
    if (chatInput) chatInput.addEventListener('input', toggleSendButtonState);
    toggleSendButtonState(); // Ініціалізація стану

    // Обробка кліків по швидких підказках
    if (quickPrompts) {
        quickPrompts.addEventListener('click', (e) => {
            const chip = e.target.closest('.prompt-chip');
            if (chip && chatInput) {
                chatInput.value = chip.textContent.replace(/[⚡📝]/g, '').trim();
                sendMessage();
            }
        });
    }

    const sendMessage = () => {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        // Ховаємо підказки після першого запиту користувача
        if (quickPrompts) quickPrompts.style.display = 'none';

        appendMessage(text, 'user-message');
        chatInput.value = '';
        toggleSendButtonState();

        // Створюємо елемент індикатора друку
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'demo-message ai-message typing-indicator-container';
        typingIndicator.innerHTML = `
            <div class="demo-typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        chatHistory.appendChild(typingIndicator);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Ефект друку безкоштовного АІ через 1.2 сек
        setTimeout(() => {
            // Видаляємо індикатор друку
            typingIndicator.remove();

            const demoResponses = [
                "That's a great question! As a demo AI, I can handle logic, text formatting, and much more. Imagine what the full Genyxo models can do!",
                "I process tasks efficiently. If you upgrade, you'll unlock GPT-5, Gemini Advanced, and even video generation with Sora.",
                "Fast, isn't it? To dive deeper and get full context window access, check out our credit packages!"
            ];
            const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
            appendMessage(randomResponse, 'ai-message');
        }, 1200);
    };

    const appendMessage = (text, className) => {
        if (!chatHistory) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `demo-message ${className}`;
        msgDiv.innerHTML = `<p style="margin:0">${text}</p>`;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});