const CHAT_CONFIG = {
    classes: {
        active: 'active',
        disabled: 'disabled'
    },
    aiResponses: [
        "That's a great question! As a demo AI, I can handle logic, text formatting, and much more. Imagine what the full Genyxo models can do!",
        "I process tasks efficiently. If you upgrade, you'll unlock GPT-5, Gemini Advanced, and even video generation with Sora.",
        "Fast, isn't it? To dive deeper and get full context window access, check out our credit packages!"
    ],
    aiDelay: 1200
};

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('demoChatModal');
    const closeBtn = document.getElementById('closeDemoBtn');
    const chatHistory = document.getElementById('demoChatHistory');
    const chatInput = document.getElementById('demoChatInput');
    const sendBtn = document.getElementById('demoSendBtn');

    if (!modal || !chatHistory || !chatInput || !sendBtn) return;

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        });
    };

    const toggleSendButtonState = () => {
        const isEmpty = chatInput.value.trim() === "";
        sendBtn.classList.toggle(CHAT_CONFIG.classes.disabled, isEmpty);
        sendBtn.disabled = isEmpty;
    };

    const closeModal = () => {
        modal.classList.remove(CHAT_CONFIG.classes.active);
    };

    const appendMessage = (text, className) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `demo-message ${className}`;
        
        const p = document.createElement('p');
        p.textContent = text;
        
        msgDiv.appendChild(p);
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    };

    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user-message');
        chatInput.value = '';
        toggleSendButtonState();

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'demo-message ai-message typing-indicator-container';
        
        const indicatorInner = document.createElement('div');
        indicatorInner.className = 'demo-typing-indicator';
        
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 3; i++) {
            fragment.appendChild(document.createElement('span'));
        }
        indicatorInner.appendChild(fragment);
        typingIndicator.appendChild(indicatorInner);
        typingIndicator.appendChild(indicatorInner);
        
        chatHistory.appendChild(typingIndicator);
        scrollToBottom();

        setTimeout(() => {
            typingIndicator.remove();
            const responses = CHAT_CONFIG.aiResponses;
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            appendMessage(randomResponse, 'ai-message');
        }, CHAT_CONFIG.aiDelay);
    };

    document.addEventListener('click', (e) => {
        if (e.target.closest('.hero-btn, a[href="#demo"]')) {
            e.preventDefault();
            modal.classList.add(CHAT_CONFIG.classes.active);
            requestAnimationFrame(() => chatInput.focus());
        }
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains(CHAT_CONFIG.classes.active)) {
            closeModal();
        }
    });

    chatInput.addEventListener('input', toggleSendButtonState);
    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    toggleSendButtonState();
});