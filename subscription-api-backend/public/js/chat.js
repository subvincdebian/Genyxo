let currentChatId = null; 
let conversations = [];
let _scrollPending = false; // scrollToBottom()
const MAX_INLINE_BASE64_LENGTH = 5_500_000;

const DOM = {
    chatBox: document.getElementById('chatBox'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    typingIndicator: document.getElementById('typingIndicator'),
    modelSelect: document.getElementById('modelSelect'),
    historyList: document.getElementById('historyList'),
    navAvatarImg: document.getElementById('navAvatar') || document.getElementById('navAvatarImg'),
    toggleBtn: document.getElementById('sidebarToggle'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    newChatBtn: document.querySelector('.new-chat-btn'),
    chatForm: document.getElementById('chatForm')
};

const chatBox = DOM.chatBox;
const welcomeScreen = DOM.welcomeScreen;
const userInput = DOM.userInput;
const sendBtn = DOM.sendBtn;
const modelSelect = DOM.modelSelect;
const historyList = DOM.historyList;
const navAvatarImg = DOM.navAvatarImg;
const toggleBtn = DOM.toggleBtn;
const sidebar = DOM.sidebar;
const sidebarOverlay = DOM.sidebarOverlay;

const TEXT_FILE_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'jsonl', 'xml', 'yaml', 'yml',
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
    'py', 'java', 'c', 'h', 'cpp', 'cxx', 'cc', 'hpp', 'cs', 'go', 'rs', 'php', 'rb',
    'swift', 'kt', 'kts', 'dart', 'lua', 'r', 'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat',
    'cmd', 'dockerfile', 'env', 'ini', 'toml', 'vue', 'svelte', 'astro'
]);

const EXTENSION_MIME_TYPES = {
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    mjs: 'text/javascript',
    cjs: 'text/javascript',
    jsx: 'text/javascript',
    ts: 'text/plain',
    tsx: 'text/plain',
    py: 'text/x-python',
    cpp: 'text/x-c++src',
    cxx: 'text/x-c++src',
    cc: 'text/x-c++src',
    c: 'text/x-csrc',
    h: 'text/x-chdr',
    hpp: 'text/x-c++hdr',
    json: 'application/json',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function updateUrl(id, push = false) {
    try {
        const url = new URL(window.location.href);
        const currentId = url.searchParams.get('id');

        const normalizedId = (id !== null && id !== undefined && String(id).trim() !== '' && String(id) !== 'null') 
            ? String(id) 
            : null;

        if (currentId === normalizedId) return;

        if (normalizedId) {
            url.searchParams.set('id', normalizedId);
        } else {
            url.searchParams.delete('id');
        }

        const state = { chatId: normalizedId };
        const newUrl = url.pathname + url.search;

        if (push) {
            window.history.pushState(state, '', newUrl);
        } else {
            window.history.replaceState(state, '', newUrl);
        }
    } catch (error) {
        console.error("Failed to update URL:", error);
    }
}

function toggleChatView(isChatActive) {
    const { welcomeScreen, chatBox } = DOM;
    if (!welcomeScreen || !chatBox) return;

    welcomeScreen.style.display = '';
    chatBox.style.display = '';

    welcomeScreen.classList.toggle('hidden', isChatActive);
    chatBox.classList.toggle('hidden', !isChatActive);
    chatBox.classList.toggle('flex-display', isChatActive);

    welcomeScreen.setAttribute('aria-hidden', isChatActive ? 'true' : 'false');
    chatBox.setAttribute('aria-hidden', isChatActive ? 'false' : 'true');

    if (isChatActive) {
        chatBox.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => {
            if (!chatBox.contains(document.activeElement)) {
                chatBox.focus({ preventScroll: true });
            }
        });
    }
}

function scrollToBottom(force = false) {
    const box = DOM.chatBox;
    if (!box || box.classList.contains('hidden')) return;

    if (_scrollPending && !force) return;

    _scrollPending = true;

    requestAnimationFrame(() => {
        _scrollPending = false;

        const { scrollHeight, scrollTop, clientHeight } = box;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        const THRESHOLD = 150;
        const isNearBottom = distanceFromBottom <= THRESHOLD;

        if (force || isNearBottom) {
            box.scrollTo({
                top: scrollHeight,
                behavior: force ? 'auto' : 'smooth',
            });
        }
    });
}

function showModal(title, placeholder = null) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const input = document.getElementById('modalInput');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');
        const titleEl = document.getElementById('modalTitle');
        
        if (!modal || !confirmBtn || !cancelBtn || !titleEl) {
            console.error('Критична помилка: Елементи модального вікна не знайдені в DOM.');
            return resolve(null);
        }

        const previousActiveElement = document.activeElement;

        titleEl.textContent = title;
        
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        
        if (placeholder !== null) {
            input.classList.remove('hidden');
            input.value = placeholder;
            requestAnimationFrame(() => input.focus());
        } else {
            input.classList.add('hidden');
            requestAnimationFrame(() => confirmBtn.focus());
        }

        const cleanup = (result) => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            if (placeholder !== null) {
                input.removeEventListener('keydown', handleInputKeyDown);
            }
            
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');

            if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
                previousActiveElement.focus();
            }
            
            resolve(result);
        };

        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cleanup(null);
            }
        };

        const handleInputKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmBtn.click();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        if (placeholder !== null) {
            input.addEventListener('keydown', handleInputKeyDown);
        }

        confirmBtn.onclick = () => cleanup(placeholder !== null ? input.value : true);
        cancelBtn.onclick = () => cleanup(null);
    });
}

async function renameChat(id) {
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;

    const newTitle = await showModal('Enter a new chat name', chat.title);

    if (newTitle === null) return;
    
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle === '' || trimmedTitle === chat.title) return;

    try {
        const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: trimmedTitle })
        });

        if (!res.ok) {
            throw new Error(`Server responded with status: ${res.status}`);
        }

        const titleElement = document.querySelector(`#chat-item-${id} .title-text`);
        if (titleElement) {
            titleElement.textContent = trimmedTitle;
        }

        chat.title = trimmedTitle;
        
        if (typeof showToast === 'function') showToast('Chat renamed successfully', 'success');
    } catch (err) {
        console.error('Error while renaming:', err);
        if (typeof showToast === 'function') {
            showToast('Failed to rename chat. Try again.', 'error');
        } else {
            alert('Error: Failed to rename chat.');
        }
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

        if (!res.ok) {
            throw new Error(`Server responded with status: ${res.status}`);
        }

        conversations = conversations.filter(c => c.id !== id);
        renderHistoryList();

        if (String(currentChatId) === String(id)) {
            currentChatId = null;
            
            if (DOM.chatBox) {
                DOM.chatBox.innerHTML = '';
            }
            
            toggleChatView(false); 
            updateUrl(null);
        }
        
        if (typeof showToast === 'function') showToast('Chat deleted', 'success');
    } catch (err) {
        console.error('Error while deleting:', err);
        if (typeof showToast === 'function') {
            showToast('Failed to delete chat.', 'error');
        } else {
            alert('Error: Failed to delete chat.');
        }
    }
}

function initHistoryListEvents(container) {
    container.onclick = null; 

    container.onclick = (e) => {
        const item = e.target.closest('.chat-item');
        if (!item) return;
        
        const chatId = parseInt(item.dataset.id);

        if (e.target.closest('.chat-options-btn')) {
            e.stopPropagation();
            toggleDropdown(e, chatId);
            return;
        }

        if (e.target.closest('.action-rename')) {
            e.stopPropagation();
            renameChat(chatId);
            return;
        }

        if (e.target.closest('.action-delete')) {
            e.stopPropagation();
            deleteChat(chatId);
            return;
        }

        selectChat(chatId);
    };
}

function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (!conversations || conversations.length === 0) {
        historyList.innerHTML = `
            <div class="no-history-msg" data-i18n="chat.no_history">
                No messages yet
            </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    conversations.forEach(chat => {
        const isActive = chat.id === currentChatId;
        
        const div = document.createElement('div');
        div.className = `chat-item ${isActive ? 'active' : ''}`;
        div.id = `chat-item-${chat.id}`;
        div.dataset.id = chat.id;

        div.innerHTML = `
            <span class="chat-title">
                <i class="far fa-message" style="margin-right:8px; font-size:0.8rem;"></i>
                <span class="title-text"></span>
            </span>
            <button class="chat-options-btn" aria-label="Chat Details">
                <i class="fas fa-ellipsis-h"></i>
            </button>
            <div class="options-dropdown" id="dropdown-${chat.id}">
                <div class="dropdown-item action-rename">
                    <i class="fas fa-pencil-alt"></i> <span data-i18n="chat.rename">Rename</span>
                </div>
                <div class="dropdown-item delete action-delete">
                    <i class="fas fa-trash"></i> <span data-i18n="chat.delete">Delete</span>
                </div>
            </div>
        `;

        div.querySelector('.title-text').textContent = chat.title || "New Chat";
        
        fragment.appendChild(div);
    });

    historyList.replaceChildren(fragment);
    
    initHistoryListEvents(historyList);
}

function addConversationToHistory(chat) {
    const id = Number(chat.id);
    if (!id || conversations.some(c => Number(c.id) === id)) return;

    conversations.unshift({
        id,
        title: chat.title || 'New Chat',
        model: chat.model || ''
    });
    renderHistoryList();

    const item = document.getElementById(`chat-item-${id}`);
    if (item) {
        item.classList.add('history-item-created');
        setTimeout(() => item.classList.remove('history-item-created'), 700);
    }
}

function startNewChat(e) {
    if (e) e.preventDefault();
    
    currentChatId = null;
    
    if (DOM.chatBox) {
        DOM.chatBox.innerHTML = '';
    }

    toggleChatView(false); 
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    
    updateUrl(null);
    
    if (window.innerWidth <= 768) {
        DOM.sidebar?.classList.remove('mobile-open', 'active');
        DOM.sidebarOverlay?.classList.remove('active', 'show');
    }
}

function getAttachmentExtension(file) {
    const name = getAttachmentName(file).toLowerCase();
    const extension = name.includes('.') ? name.split('.').pop() : name;
    return extension || '';
}

function inferAttachmentMime(file) {
    return EXTENSION_MIME_TYPES[getAttachmentExtension(file)] || '';
}

function getAttachmentMime(file) {
    const rawType = file?.type || file?.mime_type || '';
    if (rawType && rawType !== 'application/octet-stream') return rawType;
    return inferAttachmentMime(file) || rawType || 'application/octet-stream';
}

function getAttachmentName(file) {
    return file?.name || 'Attached file';
}

function getAttachmentSize(file) {
    if (typeof file?.size !== 'number') return '';
    if (typeof formatFileSize === 'function') return formatFileSize(file.size);

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    let size = file.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}

function getAttachmentImageSrc(file) {
    const mimeType = getAttachmentMime(file);

    if (typeof Blob !== 'undefined' && file instanceof Blob) {
        return URL.createObjectURL(file);
    }

    if (file?.data) {
        return `data:${mimeType};base64,${file.data}`;
    }

    return '';
}

function isDocxFile(file) {
    return getAttachmentExtension(file) === 'docx' ||
        getAttachmentMime(file) === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function isTextLikeFile(file) {
    const mimeType = getAttachmentMime(file);
    const extension = getAttachmentExtension(file);

    return (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType === 'application/xml' ||
        mimeType === 'application/javascript' ||
        mimeType === 'application/typescript' ||
        mimeType === 'image/svg+xml' ||
        TEXT_FILE_EXTENSIONS.has(extension)
    );
}

function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function base64ToText(base64) {
    try {
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch (error) {
        console.warn('Failed to decode attachment text:', error);
        return '';
    }
}

async function blobToText(blob) {
    if (!blob || typeof blob.text !== 'function') return '';
    return blob.text();
}

async function inflateRawZipEntry(bytes) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('DOCX preview is not supported in this browser.');
    }

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
}

function findZipEndOfCentralDirectory(view) {
    for (let offset = view.byteLength - 22; offset >= 0; offset--) {
        if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    return -1;
}

async function readZipEntry(arrayBuffer, matcher) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder();
    const eocdOffset = findZipEndOfCentralDirectory(view);

    if (eocdOffset < 0) return '';

    const entryCount = view.getUint16(eocdOffset + 10, true);
    let centralOffset = view.getUint32(eocdOffset + 16, true);

    for (let i = 0; i < entryCount; i++) {
        if (view.getUint32(centralOffset, true) !== 0x02014b50) break;

        const method = view.getUint16(centralOffset + 10, true);
        const compressedSize = view.getUint32(centralOffset + 20, true);
        const fileNameLength = view.getUint16(centralOffset + 28, true);
        const extraLength = view.getUint16(centralOffset + 30, true);
        const commentLength = view.getUint16(centralOffset + 32, true);
        const localHeaderOffset = view.getUint32(centralOffset + 42, true);
        const fileNameStart = centralOffset + 46;
        const fileName = decoder.decode(bytes.slice(fileNameStart, fileNameStart + fileNameLength));

        if (matcher(fileName)) {
            const localNameLength = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
            const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
            const compressed = bytes.slice(dataStart, dataStart + compressedSize);
            const output = method === 0 ? compressed : await inflateRawZipEntry(compressed);
            return decoder.decode(output);
        }

        centralOffset += 46 + fileNameLength + extraLength + commentLength;
    }

    return '';
}

function docxXmlToText(xml) {
    return xml
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<w:br\/>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function extractDocxText(file) {
    if (file?._extractedDocxText) return file._extractedDocxText;
    if (!(file instanceof Blob)) return '';

    const buffer = await file.arrayBuffer();
    const xml = await readZipEntry(buffer, name => name === 'word/document.xml');
    const text = xml ? docxXmlToText(xml) : '';
    file._extractedDocxText = text;
    return text;
}

function canSendInlineToAI(file) {
    const mimeType = getAttachmentMime(file);
    return (
        mimeType.startsWith('image/') ||
        mimeType === 'application/pdf' ||
        isTextLikeFile(file) ||
        isDocxFile(file)
    );
}

function resizeImageForVision(file, maxDimension = 1600, quality = 0.82) {
    return new Promise((resolve) => {
        if (!getAttachmentMime(file).startsWith('image/')) {
            resolve(file);
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }

                const outputType = blob.type || 'image/jpeg';
                const extension = outputType.split('/')[1] || 'jpg';
                const baseName = getAttachmentName(file).replace(/\.[^.]+$/, '') || 'image';
                resolve(new File([blob], `${baseName}.${extension}`, { type: outputType }));
            }, 'image/jpeg', quality);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        image.src = objectUrl;
    });
}

async function buildAttachmentPayload(file) {
    const mimeType = getAttachmentMime(file);
    const payload = {
        mime_type: mimeType,
        name: getAttachmentName(file),
        size: file.size
    };

    if (!canSendInlineToAI(file)) {
        return payload;
    }

    if (isDocxFile(file)) {
        const extractedText = await extractDocxText(file).catch(() => '');
        if (!extractedText) return payload;

        const data = textToBase64(extractedText);
        if (data.length > MAX_INLINE_BASE64_LENGTH) return payload;

        return {
            ...payload,
            mime_type: 'text/plain',
            data
        };
    }

    if (isTextLikeFile(file) && file instanceof Blob) {
        const text = await blobToText(file);
        const data = textToBase64(text);
        if (data.length > MAX_INLINE_BASE64_LENGTH) return payload;

        return {
            ...payload,
            mime_type: mimeType.startsWith('text/') ? mimeType : 'text/plain',
            data
        };
    }

    let sendableFile = mimeType.startsWith('image/')
        ? await resizeImageForVision(file)
        : file;

    let base64Data = await fileToBase64(sendableFile);

    if (base64Data.length > MAX_INLINE_BASE64_LENGTH && mimeType.startsWith('image/')) {
        sendableFile = await resizeImageForVision(file, 1024, 0.7);
        base64Data = await fileToBase64(sendableFile);
    }

    if (base64Data.length > MAX_INLINE_BASE64_LENGTH) {
        return payload;
    }

    return {
        ...payload,
        data: base64Data,
        mime_type: getAttachmentMime(sendableFile),
        size: sendableFile.size
    };
}

function getAttachmentIcon(file) {
    const mimeType = getAttachmentMime(file);
    const extension = getAttachmentExtension(file);

    if (mimeType.startsWith('image/')) return 'far fa-image';
    if (mimeType === 'application/pdf') return 'far fa-file-pdf';
    if (isDocxFile(file)) return 'far fa-file-word';
    if (['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'cpp', 'c', 'java', 'php', 'rb', 'go', 'rs'].includes(extension)) {
        return 'fas fa-code';
    }
    return 'far fa-file-lines';
}

function getAttachmentKind(file) {
    const mimeType = getAttachmentMime(file);
    const extension = getAttachmentExtension(file);

    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType === 'application/pdf') return 'PDF';
    if (isDocxFile(file)) return 'DOCX';
    if (TEXT_FILE_EXTENSIONS.has(extension) || isTextLikeFile(file)) return extension ? extension.toUpperCase() : 'Text';
    return 'File';
}

function getAttachmentDataUrl(file) {
    const mimeType = getAttachmentMime(file);
    if (file?.data) return `data:${mimeType};base64,${file.data}`;
    if (typeof Blob !== 'undefined' && file instanceof Blob) return URL.createObjectURL(file);
    return '';
}

function ensureFileInspector() {
    let viewer = document.getElementById('fileInspectOverlay');
    if (viewer) return viewer;

    viewer = document.createElement('div');
    viewer.id = 'fileInspectOverlay';
    viewer.className = 'file-inspect-overlay';
    viewer.innerHTML = `
        <aside class="file-inspect-panel" role="dialog" aria-modal="true" aria-labelledby="fileInspectTitle">
            <div class="file-inspect-topbar">
                <button type="button" class="file-inspect-close" aria-label="Close file preview">
                    <i class="fas fa-xmark"></i>
                </button>
                <i class="file-inspect-file-icon far fa-file-lines"></i>
                <div class="file-inspect-heading">
                    <span class="file-inspect-title" id="fileInspectTitle"></span>
                    <span class="file-inspect-meta"></span>
                </div>
            </div>
            <div class="file-inspect-body"></div>
        </aside>
    `;
    document.body.appendChild(viewer);

    const close = () => viewer.classList.remove('show');
    viewer.querySelector('.file-inspect-close').addEventListener('click', close);
    viewer.addEventListener('click', (event) => {
        if (event.target === viewer) close();
    });
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
    });

    return viewer;
}

async function getAttachmentPreviewText(file) {
    if (file?._previewText) return file._previewText;

    if (isDocxFile(file)) {
        const text = await extractDocxText(file).catch(() => '');
        file._previewText = text;
        return text;
    }

    if (file instanceof Blob && isTextLikeFile(file)) {
        const text = await blobToText(file);
        file._previewText = text;
        return text;
    }

    if (file?.data && isTextLikeFile(file)) {
        return base64ToText(file.data);
    }

    return '';
}

async function openFileInspector(file, fallbackImageSrc = '') {
    if (!file) return;

    const viewer = ensureFileInspector();
    const title = viewer.querySelector('.file-inspect-title');
    const meta = viewer.querySelector('.file-inspect-meta');
    const icon = viewer.querySelector('.file-inspect-file-icon');
    const body = viewer.querySelector('.file-inspect-body');
    const mimeType = getAttachmentMime(file);
    const fileName = getAttachmentName(file);

    title.textContent = fileName;
    meta.textContent = [getAttachmentKind(file), getAttachmentSize(file)].filter(Boolean).join(' • ');
    icon.className = `file-inspect-file-icon ${getAttachmentIcon(file)}`;
    body.innerHTML = '<div class="file-inspect-loading"><i class="fas fa-circle-notch fa-spin"></i><span>Loading preview...</span></div>';
    viewer.classList.add('show');

    if (mimeType.startsWith('image/')) {
        const src = fallbackImageSrc || getAttachmentImageSrc(file);
        body.innerHTML = '';
        const image = document.createElement('img');
        image.className = 'file-inspect-image';
        image.alt = fileName;
        image.src = src;
        body.appendChild(image);
        return;
    }

    if (mimeType === 'application/pdf') {
        const src = getAttachmentDataUrl(file);
        body.innerHTML = '';
        if (src) {
            const frame = document.createElement('iframe');
            frame.className = 'file-inspect-frame';
            frame.src = src;
            frame.title = fileName;
            body.appendChild(frame);
        } else {
            body.innerHTML = '<div class="file-inspect-empty">PDF preview is available for newly attached files.</div>';
        }
        return;
    }

    const text = await getAttachmentPreviewText(file);
    if (text) {
        body.innerHTML = '';
        const pre = document.createElement('pre');
        pre.className = 'file-inspect-code';
        pre.textContent = text;
        body.appendChild(pre);
        return;
    }

    body.innerHTML = `
        <div class="file-inspect-empty">
            <i class="${getAttachmentIcon(file)}"></i>
            <span>Preview is not available for this saved file, but new text, code, PDF and DOCX uploads are sent to AI when possible.</span>
        </div>
    `;
}

function openImageViewer(src, fileName = 'Image') {
    openFileInspector({ name: fileName, mime_type: 'image/*' }, src);
}

function buildCopyableUserMessage(text, files) {
    const parts = [];
    if (text) parts.push(text);
    if (files && files.length > 0) {
        parts.push(files.map(file => `[${getAttachmentKind(file)}: ${getAttachmentName(file)}]`).join('\n'));
    }
    return parts.join('\n\n');
}

async function copyTextToClipboard(text) {
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        if (typeof showToast === 'function') showToast('Message copied', 'success');
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        if (typeof showToast === 'function') showToast('Message copied', 'success');
    }
}

function appendMessage(sender, text, model = '', files = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message ${model ? 'model-' + model.replace('/', '-') : ''}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // 1. Отрисовка прикрепленных файлов (если они есть и это сообщение пользователя)
    if (files && files.length > 0 && sender === 'user') {
        const filesContainer = document.createElement('div');
        filesContainer.className = 'message-attachments';
        
        files.forEach(file => {
            const mimeType = getAttachmentMime(file);
            const fileName = getAttachmentName(file);

            const imageSrc = mimeType.startsWith('image/') ? getAttachmentImageSrc(file) : '';

            if (imageSrc) {
                const img = document.createElement('img');
                img.src = imageSrc;
                img.alt = fileName;
                img.title = fileName;
                img.className = 'chat-image-preview';
                img.tabIndex = 0;
                img.addEventListener('click', () => openFileInspector(file, img.src));
                img.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openFileInspector(file, img.src);
                    }
                });
                filesContainer.appendChild(img);
            } else {
                const fileLink = document.createElement('button');
                fileLink.type = 'button';
                fileLink.className = 'chat-file-preview';
                fileLink.title = `Open ${fileName}`;

                const icon = document.createElement('i');
                icon.className = getAttachmentIcon(file);

                const info = document.createElement('span');
                info.className = 'chat-file-info';

                const name = document.createElement('span');
                name.className = 'chat-file-name';
                name.textContent = fileName;

                const kind = document.createElement('span');
                kind.className = 'chat-file-kind';
                kind.textContent = getAttachmentKind(file);

                info.append(name, kind);
                fileLink.append(icon, info);

                const size = getAttachmentSize(file);
                if (size) {
                    const sizeEl = document.createElement('span');
                    sizeEl.className = 'chat-file-size';
                    sizeEl.textContent = size;
                    fileLink.appendChild(sizeEl);
                }

                fileLink.addEventListener('click', () => openFileInspector(file));
                filesContainer.appendChild(fileLink);
            }
        });
        contentDiv.appendChild(filesContainer);
    }

    // 2. Отрисовка текста (чтобы он не затирал картинки)
    const textContainer = document.createElement('div');
    textContainer.className = `message-text ${sender === 'user' ? 'user-message-text' : 'bot-message-text'}`;
    if (sender === 'bot') {
        const rawHtml = text ? marked.parse(text) : '';
        textContainer.innerHTML = DOMPurify.sanitize(rawHtml);
    } else {
        if (text) {
            textContainer.textContent = text;
        }
    }
    if (text || sender === 'bot') {
        contentDiv.appendChild(textContainer);
    }

    if (sender === 'user') {
        const actions = document.createElement('div');
        actions.className = 'user-message-actions';

        const shouldCollapse = text && (text.length > 420 || text.split('\n').length > 8);
        if (shouldCollapse) {
            textContainer.classList.add('is-collapsed');

            const expandBtn = document.createElement('button');
            expandBtn.type = 'button';
            expandBtn.className = 'message-action-btn expand-message-btn';
            expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i><span>Expand text</span>';
            expandBtn.addEventListener('click', () => {
                const collapsed = textContainer.classList.toggle('is-collapsed');
                expandBtn.innerHTML = collapsed
                    ? '<i class="fas fa-chevron-down"></i><span>Expand text</span>'
                    : '<i class="fas fa-chevron-up"></i><span>Collapse text</span>';
                scrollToBottom();
            });
            actions.appendChild(expandBtn);
        }

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'message-action-btn copy-message-btn';
        copyBtn.innerHTML = '<i class="far fa-copy"></i><span>Copy</span>';
        copyBtn.addEventListener('click', () => copyTextToClipboard(buildCopyableUserMessage(text, files)));
        actions.appendChild(copyBtn);

        contentDiv.appendChild(actions);
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

async function selectChat(id) {
    if (!id || id === 'null') {
        startNewChat();
        return;
    }

    if (currentChatId === id) return;
    
    currentChatId = id;
    renderHistoryList();
    
    toggleChatView(true); 
    updateUrl(id);

    try {
        const res = await fetch(`${API_BASE_URL}/chat/history/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const messages = await res.json();
            
            if (DOM.chatBox) DOM.chatBox.innerHTML = ''; 
            
            if (messages && messages.length > 0) {
                messages.forEach(msg => appendMessage(msg.sender, msg.content, msg.model, msg.files || []));
            }
            
            scrollToBottom(true);
        }
    } catch(e) { 
        console.error("Failed to load chat history:", e); 
    }
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

async function sendMessage() {
    const text = userInput.value.trim();
    const selectedModel = modelSelect ? modelSelect.value : 'google/gemini-2.5-flash';

    const files = window.attachedFiles ? [...window.attachedFiles] : [];

    if ((!text && files.length === 0) || !token || sendBtn.disabled) return;

    sendBtn.disabled = true;
    userInput.disabled = true;

    if (!currentChatId) toggleChatView(true);

    appendMessage('user', text, '', files);
    
    userInput.value = '';
    userInput.style.height = 'auto';
    if (typeof clearAttachedFiles === 'function') {
        clearAttachedFiles();
    } else if (window.attachedFiles) {
        window.attachedFiles.length = 0;
    }

    if (typeof renderAllPreviews === 'function') {
        renderAllPreviews(); 
    }

    const botBubble = appendMessage('bot', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
    botBubble.classList.add('streaming');
    const contentDiv = botBubble.querySelector('.message-content') || botBubble;

    let fullContent = "";
    let isUpdating = false;
    const controller = new AbortController();

    try {
        const base64Files = [];
        for (const file of files) {
            base64Files.push(await buildAttachmentPayload(file));
        }

        const url = `${API_BASE_URL}/chat/stream`;
        
        const payload = {
            message: text,
            model: selectedModel,
            files: base64Files
        };
        if (currentChatId) {
            payload.conversationId = currentChatId;
        }

        const response = await fetch(url, {
            method: 'POST', 
            signal: controller.signal,
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json', 
                'Accept': 'text/event-stream' 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/index.html';
                return;
            }
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Server error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let leftover = '';

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
                        throw new Error("❌ Insufficient funds. Please top up your balance.");
                    }

                    if (!jsonStr || jsonStr === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.error) {
                            throw new Error(data.error);
                        }

                        if (data.token) {
                            if (fullContent === "") contentDiv.innerHTML = "";
                            fullContent += data.token;
                            
                            if (!isUpdating) {
                                isUpdating = true;
                                requestAnimationFrame(() => {
                                    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullContent));
                                    scrollToBottom();
                                    isUpdating = false;
                                });
                            }
                        }

                        if (data.status === 'conversation' && data.conversationId && !currentChatId) {
                            currentChatId = data.conversationId;
                            updateUrl(data.conversationId);
                            addConversationToHistory({
                                id: currentChatId,
                                title: data.conversationTitle || (text ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : 'New Chat'),
                                model: selectedModel
                            });
                            continue;
                        }

                        if (data.conversationId && !currentChatId) {
                            currentChatId = data.conversationId;
                            updateUrl(data.conversationId);
                            addConversationToHistory({
                                id: currentChatId,
                                title: text ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : 'New Chat',
                                model: selectedModel
                            });
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
                        if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                            throw e;
                        }
                    }
                }
            }
            scrollToBottom();
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        showToast(err.message, 'error');
        contentDiv.textContent = `❌ Error: ${err.message}`;
        contentDiv.style.color = 'var(--error-red)';
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
        if (!element.isConnected) {
            clearInterval(interval);
            return;
        }

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
            clearInterval(interval);
        }
    }, 5000);
}

function appendError(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot-message error-message';
    msgDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-exclamation-circle"></i> ${msg}
        </div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

async function initChat() {
    try {
        if (!token) {
            if (typeof updateUIState === 'function') updateUIState(false);
            updateBalanceUI(0);
            toggleChatView(false);
            return;
        }

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
        } else {
            localStorage.removeItem('authToken');
            token = null;
            window.token = null;
            if (typeof updateUIState === 'function') updateUIState(false);
            updateBalanceUI(0);
            toggleChatView(false);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const chatIdFromUrl = urlParams.get('id');

        await loadConversations();

        if (chatIdFromUrl && chatIdFromUrl !== 'null') {
            await selectChat(chatIdFromUrl);
        } else if (Array.isArray(conversations) && conversations.length > 0 && conversations[0].id) {
            await selectChat(conversations[0].id);
        } else {
            startNewChat();
        }

    } catch (e) {
        console.error("Critical initialization error:", e);
        toggleChatView(false);
    }
}

const newChatBtn = document.querySelector('.new-chat-btn');
if (newChatBtn) {
    newChatBtn.onclick = (e) => {
        e.preventDefault();
        startNewChat();
    };
}

if (DOM.chatForm) {
    DOM.chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        sendMessage();
    });
} else if (sendBtn) {
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

document.addEventListener("DOMContentLoaded", () => {
    const savedModel = localStorage.getItem('selectedAIModel');
    if (savedModel) {
        // Знаходиш свій select по ID
        const selectBox = document.getElementById('yourChatSelectId'); 
        if (selectBox) {
            selectBox.value = savedModel;
            // Викликаємо change, щоб чат оновився
            selectBox.dispatchEvent(new Event('change')); 
        }
        // Очищаємо пам'ять
        localStorage.removeItem('selectedAIModel'); 
    }
});

// Редактор та передперегляд зображень в інпуті
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('imageEditorModal');
    const canvas = document.getElementById('editorCanvas');
    const ctx = canvas.getContext('2d');
    
    const closeBtn = document.getElementById('editorCloseBtn');
    const undoBtn = document.getElementById('editorUndoBtn');
    const redoBtn = document.getElementById('editorRedoBtn');
    const saveBtn = document.getElementById('editorSaveBtn');
    
    const toolBrush = document.getElementById('toolBrush');
    const toolText = document.getElementById('toolText');
    const colorPicker = document.getElementById('editorColorPicker');
    const colorPresets = document.querySelectorAll('.color-preset');
    const brushSizeInput = document.getElementById('brushSize');
    const canvasContainer = document.querySelector('.canvas-container');

    let currentTool = 'brush'; // 'brush' або 'text'
    let currentColor = '#ff0000';
    let brushSize = 6;
    let isDrawing = false;
    let originalImage = null;
    let targetPreviewImg = null; // Зберігає посилання на DOM-елемент мініатюри в інпуті
    let targetFileIndex = null;

    // Стек історії (Undo/Redo)
    let historyStack = [];
    let undoIndex = -1;

    // Обробка палітри кольорів
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            colorPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('add', 'active');
            currentColor = preset.getAttribute('data-color');
            colorPicker.value = currentColor;
            colorPicker.parentElement.style.borderColor = currentColor;
        });
    });

    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        colorPicker.parentElement.style.borderColor = currentColor;
        colorPresets.forEach(p => p.classList.remove('active'));
    });

    // Перемикання інструментів
    toolBrush.addEventListener('click', () => {
        currentTool = 'brush';
        toolBrush.classList.add('active');
        toolText.classList.remove('active');
    });

    toolText.addEventListener('click', () => {
        currentTool = 'text';
        toolText.classList.add('active');
        toolBrush.classList.remove('active');
    });

    brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
    });

    // --- ГОЛОВНА ФУНКЦІЯ: ВІДКРИТТЯ РЕДАКТОРА ---
    window.openImageEditor = function(imgSrc, sourceImgElement, index) {
        targetPreviewImg = sourceImgElement;
        targetFileIndex = index;
        modal.style.display = 'flex';
        
        originalImage = new Image();
        originalImage.crossOrigin = "anonymous"; // Запобігає проблемам з CORS
        originalImage.src = imgSrc;
        
        originalImage.onload = () => {
            // Встановлюємо внутрішню роздільну здатність полотна рівною реальному фото
            canvas.width = originalImage.naturalWidth;
            canvas.height = originalImage.naturalHeight;
            
            // Малюємо базове зображення
            ctx.drawImage(originalImage, 0, 0);
            
            // Очищення стеку історії
            historyStack = [];
            undoIndex = -1;
            saveState(); // Записуємо початковий нульовий крок
        };
    };

    // Збереження знімка стану (Snapshot)
    function saveState() {
        if (undoIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, undoIndex + 1);
        }
        const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyStack.push(state);
        undoIndex++;
        updateHistoryControls();
    }

    function updateHistoryControls() {
        undoBtn.disabled = undoIndex <= 0;
        redoBtn.disabled = undoIndex >= historyStack.length - 1;
        undoBtn.style.opacity = undoBtn.disabled ? "0.3" : "1";
        redoBtn.style.opacity = redoBtn.disabled ? "0.3" : "1";
    }

    undoBtn.addEventListener('click', () => {
        if (undoIndex > 0) {
            undoIndex--;
            ctx.putImageData(historyStack[undoIndex], 0, 0);
            updateHistoryControls();
        }
    });

    redoBtn.addEventListener('click', () => {
        if (undoIndex < historyStack.length - 1) {
            undoIndex++;
            ctx.putImageData(historyStack[undoIndex], 0, 0);
            updateHistoryControls();
        }
    });

    // Корекція координат миші/тача відносно оригінального масштабу матриці canvas
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = ((clientX - rect.left) / rect.width) * canvas.width;
        const y = ((clientY - rect.top) / rect.height) * canvas.height;
        
        return { x, y, relativeX: clientX - rect.left, relativeY: clientY - rect.top };
    }

    // --- МЕХАНІКА МАЛЮВАННЯ (ПЕНЗЕЛЬ) ---
    function startDrawing(e) {
        if (currentTool !== 'brush') return;
        isDrawing = true;
        
        const coords = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        
        ctx.lineTo(coords.x, coords.y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize * (canvas.width / canvas.getBoundingClientRect().width); // Адаптивна товщина лінії
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    function draw(e) {
        if (!isDrawing || currentTool !== 'brush') return;
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            saveState();
        }
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);

    // --- МЕХАНІКА ТЕКСТУ (КЛІК ТА ВВЕДЕННЯ) ---
    canvas.addEventListener('click', (e) => {
        if (currentTool !== 'text') return;
        if (document.querySelector('.canvas-text-input')) return; // Тільки один інпут одночасно

        const coords = getCanvasCoordinates(e);
        const rect = canvas.getBoundingClientRect();

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'canvas-text-input';
        
        // Розрахунок відображуваного розміру шрифту в редакторі
        const scale = rect.width / canvas.width;
        const calculatedSize = Math.max(14, (brushSize * 3.5) * scale);
        
        input.style.left = `${coords.relativeX + canvas.offsetLeft}px`;
        input.style.top = `${coords.relativeY + canvas.offsetTop}px`;
        input.style.fontSize = `${calculatedSize}px`;
        input.style.color = currentColor;

        canvasContainer.appendChild(input);
        input.focus();

        function commitText() {
            const val = input.value.trim();
            if (val) {
                ctx.fillStyle = currentColor;
                const realFontSize = brushSize * 3.5;
                ctx.font = `bold ${realFontSize}px sans-serif`;
                ctx.textBaseline = 'top';
                ctx.fillText(val, coords.x, coords.y);
                saveState();
            }
            input.remove();
        }

        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') commitText();
            if (ev.key === 'Escape') input.remove();
        });
        input.addEventListener('blur', commitText);
    });

    // ЗАКРИТТЯ БЕЗ ЗБЕРЕЖЕННЯ
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        const activeInput = document.querySelector('.canvas-text-input');
        if (activeInput) activeInput.remove();
    });

    // --- ФІКСАЦІЯ ЗМІН ТА ОНОВЛЕННЯ В ЧАТІ ---
    saveBtn.addEventListener('click', () => {
        const finalDataUrl = canvas.toDataURL('image/png');
        
        if (targetPreviewImg) {
            // Змінюємо src у нашої маленької мініатюри в інпуті
            targetPreviewImg.src = finalDataUrl;
            
            // Зберігаємо також у спеціальний кастомний дата-атрибут
            if (typeof targetFileIndex !== 'undefined' && targetFileIndex !== null && window.attachedFiles) {
                // Перетворюємо намальований canvas назад у справжній файл
                fetch(finalDataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        // Беремо ім'я старого файлу
                        const originalFile = window.attachedFiles[targetFileIndex];
                        const fileName = originalFile ? originalFile.name : "edited_image.png";
                        
                        // Створюємо новий файл з малюнками і замінюємо його в масиві
                        const editedFile = new File([blob], fileName, { type: "image/png" });
                        window.attachedFiles[targetFileIndex] = editedFile;
                    });
            }
        }
        
        modal.style.display = 'none';
    });

    // Додаємо підтримку гарячих клавіш Ctrl+Z / Ctrl+Y всередині модалки
    window.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undoBtn.click();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redoBtn.click();
            }
        }
    });
});

// Конвертируем файл в Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Отсекаем префикс "data:image/png;base64," и берем только саму строку
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}
