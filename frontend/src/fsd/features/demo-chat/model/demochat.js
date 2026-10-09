// Behavior migrated from demochat.js; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
const CHAT_CONFIG = {
  classes: {
    active: 'active',
    disabled: 'disabled'
  },
  aiResponses: ["That's a great question! As a demo AI, I can handle logic, text formatting, and much more. Imagine what the full Genyxo models can do!", "I process tasks efficiently. If you upgrade, you'll unlock GPT-5, Gemini Advanced, and even video generation with Sora.", "Fast, isn't it? To dive deeper and get full context window access, check out our credit packages!"],
  aiDelay: 1200
};
scope.document.addEventListener('DOMContentLoaded', () => {
  const modal = scope.document.getElementById('demoChatModal');
  const closeBtn = scope.document.getElementById('closeDemoBtn');
  const chatHistory = scope.document.getElementById('demoChatHistory');
  const chatInput = scope.document.getElementById('demoChatInput');
  const sendBtn = scope.document.getElementById('demoSendBtn');
  if (!modal || !chatHistory || !chatInput || !sendBtn) return;
  const scrollToBottom = () => {
    scope.requestAnimationFrame(() => {
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
    const msgDiv = scope.document.createElement('div');
    msgDiv.className = `demo-message ${className}`;
    const p = scope.document.createElement('p');
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
    const typingIndicator = scope.document.createElement('div');
    typingIndicator.className = 'demo-message ai-message typing-indicator-container';
    const indicatorInner = scope.document.createElement('div');
    indicatorInner.className = 'demo-typing-indicator';
    const fragment = scope.document.createDocumentFragment();
    for (let i = 0; i < 3; i++) {
      fragment.appendChild(scope.document.createElement('span'));
    }
    indicatorInner.appendChild(fragment);
    typingIndicator.appendChild(indicatorInner);
    chatHistory.appendChild(typingIndicator);
    scrollToBottom();
    scope.setTimeout(() => {
      typingIndicator.remove();
      const responses = CHAT_CONFIG.aiResponses;
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      appendMessage(randomResponse, 'ai-message');
    }, CHAT_CONFIG.aiDelay);
  };
  scope.document.addEventListener('click', e => {
    if (e.target.closest('.hero-btn, a[href="#demo"]')) {
      e.preventDefault();
      modal.classList.add(CHAT_CONFIG.classes.active);
      scope.requestAnimationFrame(() => chatInput.focus());
    }
  });
  scope.listen(closeBtn, 'click', closeModal);
  scope.listen(modal, 'click', e => {
    if (e.target === modal) closeModal();
  });
  scope.window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains(CHAT_CONFIG.classes.active)) {
      closeModal();
    }
  });
  scope.listen(chatInput, 'input', toggleSendButtonState);
  scope.listen(sendBtn, 'click', sendMessage);
  scope.listen(chatInput, 'keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  toggleSendButtonState();
});
Object.defineProperty(context, "CHAT_CONFIG", { configurable: true, get: () => CHAT_CONFIG });


}
