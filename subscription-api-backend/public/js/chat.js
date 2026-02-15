let currentChatId = null; 
let conversations = [];

const chatBox = document.getElementById('chatBox');
const welcomeScreen = document.getElementById('welcomeScreen');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const modelSelect = document.getElementById('modelSelect');
const historyList = document.getElementById('historyList');

const navAvatarImg = document.getElementById('navAvatarImg');

const toggleBtn = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleChatView(hasMessages) {
    if (hasMessages) {
        welcomeScreen.style.display = 'none';
        chatBox.style.display = 'flex';
    } else {
        welcomeScreen.style.display = 'flex';
        chatBox.style.display = 'none';
    }
}

function showModal(title, placeholder = null) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const input = document.getElementById('modalInput');
        const titleEl = document.getElementById('modalTitle');
        
        titleEl.textContent = title;
        modal.style.display = 'flex';
        
        if (placeholder !== null) {
            input.style.display = 'block';
            input.value = placeholder;
            setTimeout(() => input.focus(), 50);
        } else {
            input.style.display = 'none';
        }

        document.getElementById('modalConfirm').onclick = () => {
            const val = input.value;
            modal.style.display = 'none';
            resolve(placeholder !== null ? val : true);
        };
        
        document.getElementById('modalCancel').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
    });
}

function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    historyList.innerHTML = '';

    if (conversations.length === 0) {
        historyList.innerHTML = '<div style="font-size:0.85rem; color: #666; padding: 10px 0;" data-i18n="chat.no_history">No messages yet</div>';
        return;
    }

    conversations.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.id = `chat-item-${chat.id}`;
        div.onclick = () => selectChat(chat.id);
        div.innerHTML = `
            <span class="chat-title">
                <i class="far fa-message" style="margin-right:8px; font-size:0.8rem;"></i>
                <span class="title-text"></span>
            </span>
            <button class="chat-options-btn" aria-label="Chat Details" onclick="toggleDropdown(event, ${chat.id})">
                <i class="fas fa-ellipsis-h"></i>
            </button>
            <div class="options-dropdown" id="dropdown-${chat.id}">
                <div class="dropdown-item" onclick="renameChat(${chat.id})">
                    <i class="fas fa-pencil-alt"></i> Rename
                </div>
                <div class="dropdown-item delete" onclick="deleteChat(${chat.id})">
                    <i class="fas fa-trash"></i> Delete
                </div>
            </div>
        `;
        div.querySelector('.title-text').textContent = chat.title;
        historyList.appendChild(div);
    });
}

function startNewChat(e) {
    if (e) e.preventDefault();
    
    currentChatId = null;
    chatBox.innerHTML = '';
    welcomeScreen.style.display = 'flex';
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    
    updateUrl(null);
    
    // Если на мобилке — закрываем сайдбар (если у тебя есть функция closeSidebar)
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if(sidebar) sidebar.classList.remove('mobile-open');
        if(overlay) overlay.classList.remove('active');
    }
}

async function selectChat(id) {
    if (currentChatId === id) return;
    
    currentChatId = id;
    renderHistoryList();
    
    chatBox.innerHTML = ''; 
    toggleChatView(true);

    try {
        const res = await fetch(`${API_BASE_URL}/chat/history/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const messages = await res.json();
            messages.forEach(msg => appendMessage(msg.sender, msg.content, msg.model));
        }
    } catch(e) { console.error(e); }
}

async function loadConversations() {
    try {
        const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            conversations = await res.json();
            renderHistoryList();
        }
    } catch(e) { console.error(e); }
}

/* function appendMessage(sender, text, type = 'text') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    
    let senderClass = 'bot-message';

    if (sender === 'user') senderClass = 'user-message';
    if (sender === 'error') senderClass = 'error-message';

    msgDiv.className = `message ${senderClass}`;

    if (type === 'video') {
        msgDiv.innerHTML = `<video src="${text}" controls style="max-width: 100%; border-radius: 12px;"></video>`;
    } else {
        if (sender === 'user') {
            msgDiv.textContent = text;
        } else if (sender === 'error') {
            msgDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${text}`;
        } else {
            msgDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        }
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
} */

function scrollToBottom() {
    const threshold = 100;
    const isAtBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight <= threshold;

    if (isAtBottom) {
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }
}

function appendMessage(sender, text, model = '') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message ${model ? 'model-' + model.replace('/', '-') : ''}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (sender === 'bot') {
        const rawHtml = text ? marked.parse(text) : '';
        contentDiv.innerHTML = DOMPurify.sanitize(rawHtml);
    } else {
        contentDiv.textContent = text;
    }

    msgDiv.appendChild(contentDiv);
    
    if (model) {
        const meta = document.createElement('div');
        meta.className = 'message-meta';
        meta.textContent = model;
        msgDiv.appendChild(meta);
    }

    chatBox.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

function adjustHeight() {
    userInput.style.height = 'auto'; 
    userInput.style.height = (userInput.scrollHeight) + 'px';
}

function useSuggestion(text) {
    if (userInput) {
        userInput.value = text;
        userInput.focus();
        adjustHeight();
    }
}

function showBotLoading() {
    const div = document.createElement('div');
    div.className = 'message bot-message loading';
    div.id = 'temp-loader';
    div.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function updateUrl(id) {
    const newUrl = `${window.location.pathname}?id=${id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
}

async function sendMessage() {
    const text = userInput.value.trim();
    const selectedModel = modelSelect ? modelSelect.value : 'openai/gpt-4o-mini';

    if (!text || !token || sendBtn.disabled) return;

    sendBtn.disabled = true;
    userInput.disabled = true;

    if (!currentChatId) toggleChatView(true);

    appendMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    const botBubble = appendMessage('bot', '');
    botBubble.classList.add('streaming');

    const contentDiv = botBubble.querySelector('.message-content') || botBubble;
    let fullContent = "";

    try {
        const url = `${API_BASE_URL}/chat/stream?message=${encodeURIComponent(text)}&model=${selectedModel}${currentChatId ? `&conversationId=${currentChatId}` : ''}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/event-stream' 
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/index.html';
                return;
            }
            const errData = await response.json();
            throw new Error(errData.message || 'Server error');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let leftover = '';

        let pendingUpdate = false;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = leftover + decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            leftover = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.replace('data: ', '').trim();

                    if (jsonStr.startsWith('402')) {
                        contentDiv.innerHTML = "❌ Insufficient funds on OpenRouter. Please top up your balance.";
                        return;
                    }

                    if (!jsonStr || jsonStr === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.token) {
                            fullContent += data.token;
                            
                            if (!pendingUpdate) {
                                pendingUpdate = true;
                                requestAnimationFrame(() => {
                                    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullContent));
                                    scrollToBottom();
                                    pendingUpdate = false;
                                });
                            }
                        }

                        if (data.conversationId && !currentChatId) {
                            currentChatId = data.conversationId;
                            updateUrl(data.conversationId);

                            const newChat = {
                                id: currentChatId,
                                title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
                                model: selectedModel
                            };

                            if (!Array.isArray(conversations)) conversations = [];
                            conversations.unshift(newChat);
                            renderHistoryList();
                        }

                        if (data.messageId && (selectedModel.includes('kling') || selectedModel.includes('luma'))) {
                            botBubble.classList.remove('streaming');
                            startVideoPolling(data.messageId, contentDiv);
                            reader.cancel(); 
                            break;
                        }

                        if (data.status === 'done' && data.creditBalance !== undefined) {
                            updateBalanceUI(data.creditBalance);
                        }
                    } catch (e) { 
                        console.error("JSON parse error in stream:", e, "Line was:", line); 
                    }
                }
            }
            scrollToBottom();
        }
    } catch (err) {
        showToast(err.message, 'error');
        botBubble.innerHTML = `❌ Error: ${err.message}`;
    } finally {
        botBubble.classList.remove('streaming');
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

async function startVideoPolling(messageId, element) {
    let attempts = 0;
    const maxAttempts = 60;

    element.innerHTML = `
        <div class="video-loading-status">
            <i class="fas fa-spinner fa-spin"></i>
            <span class="status-text">Magic is happening... Generating your video</span>
        </div>
    `;

    const interval = setInterval(async () => {
        attempts++;
        
        try {
            const res = await fetch(`${API_BASE_URL}/chat/message-status/${messageId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch status');

            const data = await res.json();

            if (data.isReady && data.videoUrl) {
                clearInterval(interval);
                element.innerHTML = `
                    <div class="video-wrapper">
                        <video controls poster="">
                            <source src="${data.videoUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div class="video-actions">
                            <a href="${data.videoUrl}" target="_blank" class="download-btn">
                                <i class="fas fa-download"></i> Download Video
                            </a>
                        </div>
                    </div>
                `;
                scrollToBottom();
                return;
            }

            if (data.status === 'error' || (data.content && data.content.includes('❌'))) {
                clearInterval(interval);
                element.innerHTML = `<div class="error-box">❌ Generation failed: ${data.content || 'Unknown error'}</div>`;
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                element.innerHTML = `<div class="error-box">⚠️ Generation is taking longer than expected. Please check your history in a few minutes.</div>`;
            }

        } catch (e) {
            console.error("Polling error:", e);
        }
    }, 5000);
}

function appendError(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    msgDiv.innerHTML = `
            <div class="avatar" style="background:#e74c3c; color:white;"><i class="fas fa-exclamation"></i></div>
        <div class="message-content" style="color:#ff6b6b; border-color:#e74c3c;">
            ${msg}
        </div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

async function initChat() {
    try {
        const profileRes = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profileRes.ok) {
            const user = await profileRes.json();
            updateBalanceUI(user.credits || 0);

            if (navAvatarImg) navAvatarImg.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
            
            const dropdownAv = document.getElementById('dropdownAvatars');
            if (dropdownAv) dropdownAv.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
            
            if (menuName) menuName.textContent = user.name || 'User';
            if (menuEmail) menuEmail.textContent = user.email || '';
            if (menuCredits) menuCredits.textContent = user.credits || 0;
        }

        if (!token) {
            toggleChatView(false);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const chatIdFromUrl = urlParams.get('id');

        await loadConversations();

        if (chatIdFromUrl) {
            await selectChat(chatIdFromUrl);
        } else if (conversations && conversations.length > 0) {
            await selectChat(conversations[0].id);
        } else {
            startNewChat();
        }

    } catch (e) {
        console.error("Critical initialization error:", e);
        toggleChatView(false);
    }
}

async function renameChat(id) {
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;

    const newTitle = await showModal('Enter a new chat name', chat.title);
    
    if (newTitle === null || newTitle.trim() === '') return;

    try {
        const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: newTitle.trim() })
        });

        if (res.ok) {
            const titleElement = document.querySelector(`#chat-item-${id} .title-text`);
            if (titleElement) titleElement.textContent = newTitle.trim();

            chat.title = newTitle.trim();
        }
    } catch (err) {
        console.error('Error while renaming:', err);
    }
}

async function deleteChat(id) {
    const confirmed = await showModal('Are you sure you want to delete this chat?');
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const element = document.getElementById(`chat-item-${id}`);
            if (element) element.remove();

            conversations = conversations.filter(c => c.id !== id);

            if (currentChatId === id) {
                currentChatId = null;
                chatBox.innerHTML = '';
                welcomeScreen.style.display = 'flex';
                updateUrl(null);
            }
        }
    } catch (err) {
        console.error('Error while deleting:', err);
    }
}

const newChatBtn = document.querySelector('.new-chat-btn');
if (newChatBtn) {
    newChatBtn.onclick = (e) => {
        e.preventDefault();
        startNewChat();
    };
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
        const opened = sidebar.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('show', opened);
    });
}

if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('show');
    });
}

if (userInput) {
    userInput.addEventListener('input', adjustHeight);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {    
            e.preventDefault();
            sendMessage();
        }
    });
}

window.useSuggestion = function(cardElement) {
    const text = cardElement.querySelector('.suggestion-text').innerText;
    userInput.value = text;
    sendMessage();
}

window.toggleDropdown = function(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.options-dropdown').forEach(d => d.classList.remove('show'));
    const dropdown = document.getElementById(`dropdown-${id}`);
    if(dropdown) dropdown.classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.options-dropdown').forEach(d => d.classList.remove('show'));
});

(function() {
    const docEl = document.documentElement;

    function updateViewportVars() {
        const vv = window.visualViewport;
        const height = vv ? vv.height : window.innerHeight;
        docEl.style.setProperty('--app-height', `${height}px`);

        if (vv) {
            const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            docEl.style.setProperty('--vv-bottom', `${bottom}px`);
        } else {
            docEl.style.setProperty('--vv-bottom', '0px');
        }
    }

    updateViewportVars();

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportVars);
        window.visualViewport.addEventListener('scroll', updateViewportVars);
    }

    window.addEventListener('resize', updateViewportVars);
})();

(function(){
    const native = document.getElementById('modelSelect');
    const custom = document.getElementById('customModelSelect');
    if (!native || !custom) return;

    const optionsList = custom.querySelector('.custom-options');
    const current = custom.querySelector('.current-model-name');

    Array.from(native.options).forEach(opt => {
        const li = document.createElement('li');
        li.textContent = opt.textContent;
        li.dataset.value = opt.value;
        if (opt.selected) li.classList.add('active');
        optionsList.appendChild(li);
    });

    const selected = native.options[native.selectedIndex];
    if (selected && current) current.textContent = selected.textContent;

    function closeOptions(){
        optionsList.classList.remove('show');
        custom.setAttribute('aria-expanded','false');
    }
    function openOptions(){
        optionsList.classList.add('show');
        custom.setAttribute('aria-expanded','true');
    }

    custom.addEventListener('click', (e)=>{
        e.stopPropagation();
        const isOpen = optionsList.classList.contains('show');
        if (isOpen) closeOptions(); else openOptions();
    });

    optionsList.addEventListener('click', (e)=>{
        const li = e.target.closest('li');
        if (!li) return;
        native.value = li.dataset.value;
        if (current) current.textContent = li.textContent;
        optionsList.querySelectorAll('li').forEach(n=>n.classList.remove('active'));
        li.classList.add('active');
        closeOptions();
        native.dispatchEvent(new Event('change'));
    });

    document.addEventListener('click', (e)=>{
        if (!custom.contains(e.target) && !optionsList.contains(e.target)) closeOptions();
    });

    custom.addEventListener('keydown', (e)=>{
        const items = Array.from(optionsList.querySelectorAll('li'));
        const idx = items.findIndex(it => it.classList.contains('active'));
        if (e.key === 'ArrowDown'){
            const next = items[Math.min(items.length-1, Math.max(0, idx+1))];
            if (next) next.click();
            e.preventDefault();
        } else if (e.key === 'ArrowUp'){
            const prev = items[Math.max(0, idx-1)];
            if (prev) prev.click();
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
            const isOpen = optionsList.classList.contains('show');
            if (!isOpen) openOptions(); else closeOptions();
            e.preventDefault();
        } else if (e.key === 'Escape'){
            closeOptions();
        }
    });
})();

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q');

    if (searchQuery && userInput) {
        userInput.value = searchQuery;
        
        setTimeout(() => {
            sendMessage();
        }, 500); 
    }

    setTimeout(() => {
        if (userInput && userInput.value.length > 0) {
            userInput.placeholder = userInput.value;
            userInput.value = "";
        }
    }, 500);
});

document.addEventListener('DOMContentLoaded', () => {
    if(window.i18n && typeof window.i18n.init === 'function') {
        window.i18n.init().then(initChat);
    } else {
        initChat();
    }
});
