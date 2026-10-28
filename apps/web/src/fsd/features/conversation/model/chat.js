// Behavior migrated from chat.js; resources are owned by the React mount.
import DOMPurify from "dompurify";
import { marked } from "marked";
import { chatKeyFromPath, chatPath, isChatPath, rememberChatKeys, resolveChatKey } from "@/shared/lib/chat-url";
export default function initialize(scope, context) {
  let currentChatId = null;
  let conversations = [];
  let projects = [];
  let activeProjectId = null;
  // undefined preserves the saved selection; null explicitly removes it.
  let activePresetId;
  let pendingFirstSend = null;
  let chatViewRevision = 0;
  let activeSendController = null;
  function publishWorkspaceState() {
    if (!context.workspaceManaged) return;
    scope.document.dispatchEvent(new CustomEvent("genyxo:chat-state", { detail: { conversationId: currentChatId, projectId: activeProjectId } }));
  }
  let _scrollPending = false; // scrollToBottom()
  const MAX_INLINE_BASE64_LENGTH = 5_500_000;
  const DOM = {
    chatBox: scope.document.getElementById("chatBox"),
    welcomeScreen: scope.document.getElementById("welcomeScreen"),
    userInput: scope.document.getElementById("userInput"),
    sendBtn: scope.document.getElementById("sendBtn"),
    typingIndicator: scope.document.getElementById("typingIndicator"),
    modelSelect: scope.document.getElementById("modelSelect"),
    historyList: scope.document.getElementById("historyList"),
    navAvatarImg:
      scope.document.getElementById("navAvatar") ||
      scope.document.getElementById("navAvatarImg"),
    toggleBtn: scope.document.getElementById("sidebarToggle"),
    sidebar: scope.document.getElementById("sidebar"),
    sidebarOverlay: scope.document.getElementById("sidebarOverlay"),
    newChatBtn: scope.document.querySelector(".new-chat-btn"),
    chatForm: scope.document.getElementById("chatForm"),
  };
  const chatBox = DOM.chatBox;
  const welcomeScreen = DOM.welcomeScreen;
  const userInput = DOM.userInput;
  const sendBtn = DOM.sendBtn;
  const modelSelect = DOM.modelSelect;
  const historyList = DOM.historyList;
  let stopDictation = () => {};
  const navAvatarImg = DOM.navAvatarImg;
  const toggleBtn = DOM.toggleBtn;
  const sidebar = DOM.sidebar;
  const sidebarOverlay = DOM.sidebarOverlay;
  const TEXT_FILE_EXTENSIONS = new Set([
    "txt",
    "md",
    "markdown",
    "csv",
    "tsv",
    "log",
    "json",
    "jsonl",
    "xml",
    "yaml",
    "yml",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    "js",
    "mjs",
    "cjs",
    "ts",
    "tsx",
    "jsx",
    "py",
    "java",
    "c",
    "h",
    "cpp",
    "cxx",
    "cc",
    "hpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "kts",
    "dart",
    "lua",
    "r",
    "sql",
    "sh",
    "bash",
    "zsh",
    "ps1",
    "bat",
    "cmd",
    "dockerfile",
    "env",
    "ini",
    "toml",
    "vue",
    "svelte",
    "astro",
  ]);
  const EXTENSION_MIME_TYPES = {
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    mjs: "text/javascript",
    cjs: "text/javascript",
    jsx: "text/javascript",
    ts: "text/plain",
    tsx: "text/plain",
    py: "text/x-python",
    cpp: "text/x-c++src",
    cxx: "text/x-c++src",
    cc: "text/x-c++src",
    c: "text/x-csrc",
    h: "text/x-chdr",
    hpp: "text/x-c++hdr",
    json: "application/json",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  // Chats live at /c/<key>, never at their numeric id (see shared/lib/chat-url).
  async function updateUrl(id, push = false) {
    if (context.workspaceManaged && !isChatPath(scope.window.location.pathname)) return;
    try {
      const normalizedId =
        id !== null &&
        id !== undefined &&
        String(id).trim() !== "" &&
        String(id) !== "null"
          ? String(id)
          : null;
      const path = normalizedId ? await chatPath(Number(normalizedId)) : "/chat";
      // The key arrives asynchronously; drop it if another chat opened meanwhile.
      if (!path || String(currentChatId ?? null) !== String(normalizedId)) return;
      const url = new URL(scope.window.location.href);
      if (url.pathname === path && !url.searchParams.has("id")) return;
      url.pathname = path;
      url.searchParams.delete("id");
      const state = {
        chatId: normalizedId,
      };
      const newUrl = url.pathname + url.search;
      if (push) {
        scope.window.history.pushState(state, "", newUrl);
      } else {
        scope.window.history.replaceState(state, "", newUrl);
      }
    } catch (error) {
      console.error("Failed to update URL:", error);
    }
  }
  function toggleChatView(isChatActive) {
    const { welcomeScreen, chatBox } = DOM;
    if (!welcomeScreen || !chatBox) return;
    welcomeScreen.style.display = "";
    chatBox.style.display = "";
    welcomeScreen.classList.toggle("hidden", isChatActive);
    chatBox.classList.toggle("hidden", !isChatActive);
    chatBox.classList.toggle("flex-display", isChatActive);
    welcomeScreen.setAttribute("aria-hidden", isChatActive ? "true" : "false");
    chatBox.setAttribute("aria-hidden", isChatActive ? "false" : "true");
    if (isChatActive) {
      chatBox.setAttribute("tabindex", "-1");
    }
  }
  function scrollToBottom(force = false) {
    const box = DOM.chatBox;
    if (!box || box.classList.contains("hidden")) return;
    if (_scrollPending && !force) return;
    _scrollPending = true;
    scope.requestAnimationFrame(() => {
      _scrollPending = false;
      const { scrollHeight, scrollTop, clientHeight } = box;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const THRESHOLD = 150;
      const isNearBottom = distanceFromBottom <= THRESHOLD;
      if (force || isNearBottom) {
        box.scrollTo({
          top: scrollHeight,
          behavior: force ? "auto" : "smooth",
        });
      }
    });
  }
  function showModal(title, placeholder = null) {
    return new Promise((resolve) => {
      const modal = scope.document.getElementById("customModal");
      const input = scope.document.getElementById("modalInput");
      const confirmBtn = scope.document.getElementById("modalConfirm");
      const cancelBtn = scope.document.getElementById("modalCancel");
      const titleEl = scope.document.getElementById("modalTitle");
      if (!modal || !confirmBtn || !cancelBtn || !titleEl) {
        console.error(
          "Критична помилка: Елементи модального вікна не знайдені в DOM.",
        );
        return resolve(null);
      }
      const previousActiveElement = scope.document.activeElement;
      titleEl.textContent = title;
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
      if (placeholder !== null) {
        input.classList.remove("hidden");
        input.style.display = "block";
        input.value = placeholder;
        scope.requestAnimationFrame(() => input.focus());
      } else {
        input.classList.add("hidden");
        input.style.display = "none";
        scope.requestAnimationFrame(() => confirmBtn.focus());
      }
      const cleanup = (result) => {
        scope.window.removeEventListener("keydown", handleGlobalKeyDown);
        if (placeholder !== null) {
          input.removeEventListener("keydown", handleInputKeyDown);
        }
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        if (
          previousActiveElement &&
          typeof previousActiveElement.focus === "function"
        ) {
          previousActiveElement.focus();
        }
        resolve(result);
      };
      const handleGlobalKeyDown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cleanup(null);
        }
      };
      const handleInputKeyDown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmBtn.click();
        }
      };
      scope.window.addEventListener("keydown", handleGlobalKeyDown);
      if (placeholder !== null) {
        scope.listen(input, "keydown", handleInputKeyDown);
      }
      confirmBtn.onclick = () =>
        cleanup(placeholder !== null ? input.value : true);
      cancelBtn.onclick = () => cleanup(null);
    });
  }
  async function renameChat(id) {
    const chat = conversations.find((c) => c.id === id);
    if (!chat) return;
    const newTitle = await showModal("Enter a new chat name", chat.title);
    if (newTitle === null) return;
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle === "" || trimmedTitle === chat.title) return;
    try {
      const res = await scope.fetch(
        `${context.API_BASE_URL}/chat/conversations/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${context.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }
      const titleElement = scope.document.querySelector(
        `#chat-item-${id} .title-text`,
      );
      if (titleElement) {
        titleElement.textContent = trimmedTitle;
      }
      chat.title = trimmedTitle;
      if (typeof context.showToast === "function")
        context.showToast("Chat renamed successfully", "success");
    } catch (err) {
      console.error("Error while renaming:", err);
      if (typeof context.showToast === "function") {
        context.showToast("Failed to rename chat. Try again.", "error");
      } else {
        alert("Error: Failed to rename chat.");
      }
    }
  }
  async function deleteChat(id) {
    const confirmed = await showModal(
      "Are you sure you want to delete this chat?",
    );
    if (!confirmed) return;
    try {
      const res = await scope.fetch(
        `${context.API_BASE_URL}/chat/conversations/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${context.token}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }
      conversations = conversations.filter((c) => c.id !== id);
      renderHistoryList();
      renderProjectSidebar();
      if (String(currentChatId) === String(id)) {
        currentChatId = null;
        if (DOM.chatBox) {
          DOM.chatBox.innerHTML = scope.sanitizeHtml("");
        }
        toggleChatView(false);
        updateUrl(null);
      }
      if (typeof context.showToast === "function")
        context.showToast("Chat deleted", "success");
    } catch (err) {
      console.error("Error while deleting:", err);
      if (typeof context.showToast === "function") {
        context.showToast("Failed to delete chat.", "error");
      } else {
        alert("Error: Failed to delete chat.");
      }
    }
  }
  function initHistoryListEvents(container) {
    container.onclick = null;
    container.onclick = (e) => {
      const item = e.target.closest(".chat-item");
      if (!item) return;
      const chatId = parseInt(item.dataset.id);
      if (e.target.closest(".chat-options-btn")) {
        e.stopPropagation();
        scope.window.toggleDropdown(e, chatId);
        return;
      }
      if (e.target.closest(".action-rename")) {
        e.stopPropagation();
        renameChat(chatId);
        return;
      }
      if (e.target.closest(".action-delete")) {
        e.stopPropagation();
        deleteChat(chatId);
        return;
      }
      selectChat(chatId);
    };
  }
  function renderHistoryList() {
    if (context.workspaceManaged) { publishWorkspaceState(); return; }
    const historyList = scope.document.getElementById("historyList");
    if (!historyList) return;
    const recentChats = (conversations || []).filter((chat) => !chat.projectId);
    if (recentChats.length === 0) {
      historyList.innerHTML = scope.sanitizeHtml(`
            <div class="no-history-msg" data-i18n="chat.no_history">
                No recent chats
            </div>`);
      return;
    }
    const fragment = scope.document.createDocumentFragment();
    recentChats.forEach((chat) => {
      const isActive = chat.id === currentChatId;
      const div = scope.document.createElement("div");
      div.className = `chat-item ${isActive ? "active" : ""}`;
      div.id = `chat-item-${chat.id}`;
      div.dataset.id = chat.id;
      div.innerHTML = scope.sanitizeHtml(`
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
        `);
      div.querySelector(".title-text").textContent = chat.title || "New Chat";
      fragment.appendChild(div);
    });
    historyList.replaceChildren(fragment);
    initHistoryListEvents(historyList);
  }
  function addConversationToHistory(chat) {
    const id = Number(chat.id);
    if (!id || conversations.some((c) => Number(c.id) === id)) return;
    conversations.unshift({
      id,
      title: chat.title || "New Chat",
      model: chat.model || "",
      projectId: activeProjectId,
    });
    renderHistoryList();
    renderProjectSidebar();
    if (context.workspaceManaged) scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"));
    const item = scope.document.getElementById(`chat-item-${id}`);
    if (item) {
      item.classList.add("history-item-created");
      scope.setTimeout(
        () => item.classList.remove("history-item-created"),
        700,
      );
    }
  }
  function startNewChat(e) {
    if (e) e.preventDefault();
    chatViewRevision++;
    activeSendController?.abort();
    activeSendController = null;
    currentChatId = null;
    activePresetId = undefined;
    pendingFirstSend = null;
    setActiveProject(null);
    if (userInput) { userInput.value = ""; userInput.disabled = false; userInput.style.height = "auto"; userInput.dispatchEvent(new Event("input", { bubbles: true })); }
    if (sendBtn) sendBtn.disabled = false;
    if (scope.window.attachedFiles) scope.window.attachedFiles.length = 0;
    context.renderAllPreviews?.();
    publishWorkspaceState();
    if (DOM.chatBox) {
      DOM.chatBox.innerHTML = scope.sanitizeHtml("");
    }
    toggleChatView(false);
    scope.document
      .querySelectorAll(".chat-item")
      .forEach((item) => item.classList.remove("active"));
    updateUrl(null);
    if (scope.window.innerWidth <= 768) {
      DOM.sidebar?.classList.remove("mobile-open", "active");
      DOM.sidebarOverlay?.classList.remove("active", "show");
    }
  }
  function getAttachmentExtension(file) {
    const name = getAttachmentName(file).toLowerCase();
    const extension = name.includes(".") ? name.split(".").pop() : name;
    return extension || "";
  }
  function inferAttachmentMime(file) {
    return EXTENSION_MIME_TYPES[getAttachmentExtension(file)] || "";
  }
  function getAttachmentMime(file) {
    const rawType = file?.type || file?.mime_type || "";
    if (rawType && rawType !== "application/octet-stream") return rawType;
    return inferAttachmentMime(file) || rawType || "application/octet-stream";
  }
  function getAttachmentName(file) {
    return file?.name || "Attached file";
  }
  function getAttachmentSize(file) {
    if (typeof file?.size !== "number") return "";
    if (typeof context.formatFileSize === "function")
      return context.formatFileSize(file.size);
    const units = ["Bytes", "KB", "MB", "GB"];
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
    if (typeof Blob !== "undefined" && file instanceof Blob) {
      return URL.createObjectURL(file);
    }
    if (file?.data) {
      return `data:${mimeType};base64,${file.data}`;
    }
    return "";
  }
  function isDocxFile(file) {
    return (
      getAttachmentExtension(file) === "docx" ||
      getAttachmentMime(file) ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }
  function isTextLikeFile(file) {
    const mimeType = getAttachmentMime(file);
    const extension = getAttachmentExtension(file);
    return (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      mimeType === "application/javascript" ||
      mimeType === "application/typescript" ||
      mimeType === "image/svg+xml" ||
      TEXT_FILE_EXTENSIONS.has(extension)
    );
  }
  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  function base64ToText(base64) {
    try {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.warn("Failed to decode attachment text:", error);
      return "";
    }
  }
  async function blobToText(blob) {
    if (!blob || typeof blob.text !== "function") return "";
    return blob.text();
  }
  async function inflateRawZipEntry(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("DOCX preview is not supported in this browser.");
    }
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
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
    if (eocdOffset < 0) return "";
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
      const fileName = decoder.decode(
        bytes.slice(fileNameStart, fileNameStart + fileNameLength),
      );
      if (matcher(fileName)) {
        const localNameLength = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
        const dataStart =
          localHeaderOffset + 30 + localNameLength + localExtraLength;
        const compressed = bytes.slice(dataStart, dataStart + compressedSize);
        const output =
          method === 0 ? compressed : await inflateRawZipEntry(compressed);
        return decoder.decode(output);
      }
      centralOffset += 46 + fileNameLength + extraLength + commentLength;
    }
    return "";
  }
  const XML_ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
  function docxXmlToText(xml) {
    let text = xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n");
    // Until none are left, so split tags cannot reassemble.
    for (let previous; previous !== text; ) {
      previous = text;
      text = text.replace(/<[^<>]*>/g, "");
    }
    // One pass, so "&amp;lt;" stays the text "&lt;".
    return text
      .replace(/&(lt|gt|amp|quot|apos);/g, (_match, name) => XML_ENTITIES[name])
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  async function extractDocxText(file) {
    if (file?._extractedDocxText) return file._extractedDocxText;
    if (!(file instanceof Blob)) return "";
    const buffer = await file.arrayBuffer();
    const xml = await readZipEntry(
      buffer,
      (name) => name === "word/document.xml",
    );
    const text = xml ? docxXmlToText(xml) : "";
    file._extractedDocxText = text;
    return text;
  }
  function canSendInlineToAI(file) {
    const mimeType = getAttachmentMime(file);
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      isTextLikeFile(file) ||
      isDocxFile(file)
    );
  }
  function resizeImageForVision(file, maxDimension = 1600, quality = 0.82) {
    return new Promise((resolve) => {
      if (!getAttachmentMime(file).startsWith("image/")) {
        resolve(file);
        return;
      }
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height),
        );
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = scope.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const outputType = blob.type || "image/jpeg";
            const extension = outputType.split("/")[1] || "jpg";
            const baseName =
              getAttachmentName(file).replace(/\.[^.]+$/, "") || "image";
            resolve(
              new File([blob], `${baseName}.${extension}`, {
                type: outputType,
              }),
            );
          },
          "image/jpeg",
          quality,
        );
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
      size: file.size,
    };
    if (!canSendInlineToAI(file)) {
      throw new Error(`${payload.name} is not a supported attachment type.`);
    }
    if (isDocxFile(file)) {
      const extractedText = await extractDocxText(file).catch(() => "");
      if (!extractedText) throw new Error(`Could not read text from ${payload.name}.`);
      const data = textToBase64(extractedText);
      if (data.length > MAX_INLINE_BASE64_LENGTH) throw new Error(`${payload.name} is too large to analyze.`);
      return {
        ...payload,
        mime_type: "text/plain",
        data,
      };
    }
    if (isTextLikeFile(file) && file instanceof Blob) {
      const text = await blobToText(file);
      const data = textToBase64(text);
      if (data.length > MAX_INLINE_BASE64_LENGTH) throw new Error(`${payload.name} is too large to analyze.`);
      return {
        ...payload,
        mime_type: mimeType.startsWith("text/") ? mimeType : "text/plain",
        data,
      };
    }
    let sendableFile = mimeType.startsWith("image/")
      ? await resizeImageForVision(file)
      : file;
    let base64Data = await fileToBase64(sendableFile);
    if (
      base64Data.length > MAX_INLINE_BASE64_LENGTH &&
      mimeType.startsWith("image/")
    ) {
      sendableFile = await resizeImageForVision(file, 1024, 0.7);
      base64Data = await fileToBase64(sendableFile);
    }
    if (base64Data.length > MAX_INLINE_BASE64_LENGTH) {
      throw new Error(`${payload.name} is too large to analyze.`);
    }
    return {
      ...payload,
      data: base64Data,
      mime_type: getAttachmentMime(sendableFile),
      size: sendableFile.size,
    };
  }
  function getAttachmentIcon(file) {
    const mimeType = getAttachmentMime(file);
    const extension = getAttachmentExtension(file);
    if (mimeType.startsWith("image/")) return "far fa-image";
    if (mimeType === "application/pdf") return "far fa-file-pdf";
    if (isDocxFile(file)) return "far fa-file-word";
    if (
      [
        "html",
        "css",
        "js",
        "ts",
        "jsx",
        "tsx",
        "py",
        "cpp",
        "c",
        "java",
        "php",
        "rb",
        "go",
        "rs",
      ].includes(extension)
    ) {
      return "fas fa-code";
    }
    return "far fa-file-lines";
  }
  function getAttachmentKind(file) {
    const mimeType = getAttachmentMime(file);
    const extension = getAttachmentExtension(file);
    if (mimeType.startsWith("image/")) return "Image";
    if (mimeType === "application/pdf") return "PDF";
    if (isDocxFile(file)) return "DOCX";
    if (TEXT_FILE_EXTENSIONS.has(extension) || isTextLikeFile(file))
      return extension ? extension.toUpperCase() : "Text";
    return "File";
  }
  function getAttachmentDataUrl(file) {
    const mimeType = getAttachmentMime(file);
    if (file?.data) return `data:${mimeType};base64,${file.data}`;
    if (typeof Blob !== "undefined" && file instanceof Blob)
      return URL.createObjectURL(file);
    return "";
  }
  function ensureFileInspector() {
    let viewer = scope.document.getElementById("fileInspectOverlay");
    if (viewer) return viewer;
    viewer = scope.document.createElement("div");
    viewer.id = "fileInspectOverlay";
    viewer.className = "file-inspect-overlay";
    viewer.innerHTML = scope.sanitizeHtml(`
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
                <div class="file-inspect-actions"></div>
            </div>
            <div class="file-inspect-body"></div>
        </aside>
    `);
    scope.document.body.appendChild(viewer);
    const close = () => viewer.classList.remove("show");
    scope.listen(viewer.querySelector(".file-inspect-close"), "click", close);
    scope.listen(viewer, "click", (event) => {
      if (event.target === viewer) close();
    });
    scope.window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    return viewer;
  }
  async function getAttachmentPreviewText(file) {
    if (file?._previewText) return file._previewText;
    if (isDocxFile(file)) {
      const text = await extractDocxText(file).catch(() => "");
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
    return "";
  }
  async function openFileInspector(file, fallbackImageSrc = "") {
    if (!file) return;
    const viewer = ensureFileInspector();
    const title = viewer.querySelector(".file-inspect-title");
    const meta = viewer.querySelector(".file-inspect-meta");
    const icon = viewer.querySelector(".file-inspect-file-icon");
    const body = viewer.querySelector(".file-inspect-body");
    const actions = viewer.querySelector(".file-inspect-actions");
    const mimeType = getAttachmentMime(file);
    const fileName = getAttachmentName(file);
    title.textContent = fileName;
    meta.textContent = [getAttachmentKind(file), getAttachmentSize(file)]
      .filter(Boolean)
      .join(" • ");
    icon.className = `file-inspect-file-icon ${getAttachmentIcon(file)}`;
    actions.replaceChildren();
    body.innerHTML = scope.sanitizeHtml(
      '<div class="file-inspect-loading"><i class="fas fa-circle-notch fa-spin"></i><span>Loading preview...</span></div>',
    );
    viewer.classList.add("show");
    if (mimeType.startsWith("image/")) {
      const src = fallbackImageSrc || getAttachmentImageSrc(file);
      body.innerHTML = scope.sanitizeHtml("");
      const image = scope.document.createElement("img");
      image.className = "file-inspect-image";
      image.alt = fileName;
      image.src = src;
      body.appendChild(image);
      return;
    }
    if (mimeType === "application/pdf") {
      const src = getAttachmentDataUrl(file);
      body.innerHTML = scope.sanitizeHtml("");
      if (src) {
        const frame = scope.document.createElement("iframe");
        frame.className = "file-inspect-frame";
        frame.src = src;
        frame.title = fileName;
        body.appendChild(frame);
      } else {
        body.innerHTML = scope.sanitizeHtml(
          '<div class="file-inspect-empty">PDF preview is available for newly attached files.</div>',
        );
      }
      return;
    }
    const text = await getAttachmentPreviewText(file);
    if (text) {
      body.innerHTML = scope.sanitizeHtml("");
      actions.append(
        createCodeActionButton("fas fa-download", "Download file", () =>
          downloadTextFile(text, fileName),
        ),
        createCodeActionButton("far fa-copy", "Copy file", () =>
          copyTextToClipboard(text),
        ),
      );
      const wrapper = scope.document.createElement("div");
      wrapper.className = "file-code-preview";
      const pre = scope.document.createElement("pre");
      pre.className = "file-inspect-code";
      const code = scope.document.createElement("code");
      code.className = `language-${getAttachmentExtension(file) || "text"}`;
      code.textContent = text;
      pre.appendChild(code);
      wrapper.appendChild(pre);
      body.appendChild(wrapper);
      enhanceCodeBlocks(body, getAttachmentExtension(file));
      return;
    }
    body.innerHTML = scope.sanitizeHtml(`
        <div class="file-inspect-empty">
            <i class="${getAttachmentIcon(file)}"></i>
            <span>Preview is not available for this saved file, but new text, code, PDF and DOCX uploads are sent to AI when possible.</span>
        </div>
    `);
  }
  function openImageViewer(src, fileName = "Image") {
    openFileInspector(
      {
        name: fileName,
        mime_type: "image/*",
      },
      src,
    );
  }
  function buildCopyableUserMessage(text, files) {
    const parts = [];
    if (text) parts.push(text);
    if (files && files.length > 0) {
      parts.push(
        files
          .map(
            (file) =>
              `[${getAttachmentKind(file)}: ${getAttachmentName(file)}]`,
          )
          .join("\n"),
      );
    }
    return parts.join("\n\n");
  }
  async function copyTextToClipboard(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (typeof context.showToast === "function")
        context.showToast("Message copied", "success");
    } catch (error) {
      const textarea = scope.document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      scope.document.body.appendChild(textarea);
      textarea.select();
      scope.document.execCommand("copy");
      textarea.remove();
      if (typeof context.showToast === "function")
        context.showToast("Message copied", "success");
    }
  }
  function showReviewToast() {
    const message =
      "Thanks for your review, it helps to make our platform better";
    if (typeof context.showToast === "function")
      context.showToast(message, "success");
  }
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function getCodeLanguageFromClass(codeEl) {
    const className = codeEl?.className || "";
    const match = className.match(/(?:language|lang)-([\w#+.-]+)/i);
    return match ? match[1].toLowerCase() : "";
  }
  function getCodeExtension(language = "txt") {
    const map = {
      javascript: "js",
      js: "js",
      typescript: "ts",
      ts: "ts",
      jsx: "jsx",
      tsx: "tsx",
      html: "html",
      css: "css",
      python: "py",
      py: "py",
      cpp: "cpp",
      c: "c",
      json: "json",
      bash: "sh",
      shell: "sh",
      sql: "sql",
    };
    return map[language] || language || "txt";
  }
  function highlightCode(code, language = "") {
    const html = escapeHtml(code);
    if (language === "diff" || language === "patch") return html.split("\n").map(line => `<span class="gx-diff-line${line.startsWith("+") ? " gx-diff-add" : line.startsWith("-") ? " gx-diff-remove" : ""}">${line || " "}</span>`).join("\n");
    const keywords =
      /\b(const|let|var|function|return|if|else|for|while|class|new|async|await|try|catch|import|from|export|default|type|interface|extends|public|private|protected|static|void|int|float|double|char|bool|true|false|null|undefined|def|self|print|echo|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE)\b/;
    const builtins =
      /\b(document|window|console|Math|Array|Object|String|Number|Promise|React|useState|useEffect)\b/;
    const tokenPattern =
      /(#(?:[0-9a-fA-F]{3,8})\b|[.#][A-Za-z_-][\w-]*|(?<=\s)[A-Za-z-]+(?=\s*:)|&lt;\/?[\w:-]+|\s[\w:-]+(?==)|&quot;.*?&quot;|&#039;.*?&#039;|`[\s\S]*?`|\/\/.*|\/\*[\s\S]*?\*\/|(?<![&\w])#(?![0-9a-fA-F]{3,8}\b).*|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b|\b[A-Za-z_$][\w$]*\b)/g;
    // The pattern has one capture group, so the offset is the third argument.
    return html.replace(tokenPattern, (token, _group, offset, source) => {
      const trimmed = token.trim();
      const nextText = source.slice(offset + token.length).trimStart();
      const isCss =
        language === "css" || language === "scss" || language === "sass";
      if (/^#[0-9a-fA-F]{3,8}$/.test(token))
        return `<span class="tok-number">${token}</span>`;
      if (isCss && /^[.#][A-Za-z_-][\w-]*$/.test(trimmed))
        return `<span class="tok-selector">${token}</span>`;
      if (
        isCss &&
        /^[A-Za-z_-][\w-]*$/.test(trimmed) &&
        (code.includes(`.${trimmed}`) || code.includes(`#${trimmed}`))
      )
        return `<span class="tok-selector">${token}</span>`;
      if (isCss && /^[A-Za-z-]+$/.test(trimmed) && nextText.startsWith(":"))
        return `<span class="tok-property">${token}</span>`;
      if (token.startsWith("&lt;"))
        return token.replace(
          trimmed,
          `<span class="tok-tag">${trimmed}</span>`,
        );
      if (
        /^\s[\w:-]+$/.test(token) &&
        ["html", "xml", "jsx", "tsx"].includes(language)
      ) {
        return token.replace(
          trimmed,
          `<span class="tok-attr">${trimmed}</span>`,
        );
      }
      if (
        token.startsWith("&quot;") ||
        token.startsWith("&#039;") ||
        token.startsWith("`")
      )
        return `<span class="tok-string">${token}</span>`;
      if (
        token.startsWith("//") ||
        token.startsWith("/*") ||
        token.startsWith("#")
      )
        return `<span class="tok-comment">${token}</span>`;
      if (/^\d/.test(token)) return `<span class="tok-number">${token}</span>`;
      if (keywords.test(token))
        return `<span class="tok-keyword">${token}</span>`;
      if (builtins.test(token))
        return `<span class="tok-builtin">${token}</span>`;
      return token;
    });
  }
  function downloadTextFile(text, fileName = "code.txt") {
    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = scope.document.createElement("a");
    link.href = url;
    link.download = fileName;
    scope.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function createCodeActionButton(iconClass, label, onClick) {
    const button = scope.document.createElement("button");
    button.type = "button";
    button.className = "code-action-btn";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = scope.sanitizeHtml(`<i class="${iconClass}"></i>`);
    scope.listen(button, "click", onClick);
    return button;
  }
  function normalizeCodeLanguage(language = "") {
    const normalized = String(language || "")
      .toLowerCase()
      .trim();
    const aliases = {
      htm: "html",
      markup: "html",
      xml: "html",
      mjs: "javascript",
      cjs: "javascript",
      sh: "bash",
      zsh: "bash",
      ps1: "powershell",
      text: "text",
      txt: "text",
    };
    return aliases[normalized] || normalized || "text";
  }
  function getDirectCodeElement(pre) {
    if (!pre) return null;
    for (const child of pre.children) {
      if (child.tagName?.toLowerCase() === "code") return child;
    }
    return null;
  }
  function getCodeLanguageFromPre(preEl) {
    const className = preEl?.className || "";
    const match = className.match(/(?:language|lang)-([\w#+.-]+)/i);
    return match ? match[1].toLowerCase() : "";
  }
  // Fences labelled ```lang file=name.ext are files the model made for the user.
  function markFileFences(markdown = "") {
    return markdown.replace(/```([\w#+.-]*)[ \t]+file=(["']?)([^\s"'`]+)\2[^\n]*/g, "```$1:file=$3");
  }
  function getCodeFileName(codeEl) {
    const match = (codeEl?.className || "").match(/:file=([^\s]+)/);
    return match ? match[1].split(/[\/]/).pop().slice(0, 120) : "";
  }
  const FILE_KINDS = {
    py: ["Python", "#3776ab"], js: ["JavaScript", "#e8c547"], ts: ["TypeScript", "#3178c6"], tsx: ["React", "#5fd1f5"],
    jsx: ["React", "#5fd1f5"], html: ["HTML page", "#e8673c"], css: ["Stylesheet", "#6f6cf0"], json: ["JSON data", "#9aa6a3"],
    md: ["Markdown", "#4cc9a4"], txt: ["Text", "#9aa6a3"], csv: ["Spreadsheet", "#22a55b"], sql: ["SQL", "#d48a32"],
    svg: ["SVG graphic", "#f2a33a"], sh: ["Shell script", "#7bc96f"], yml: ["YAML", "#cb4b6d"], yaml: ["YAML", "#cb4b6d"],
    xml: ["XML", "#e8673c"], java: ["Java", "#e76f00"], go: ["Go", "#00add8"], rs: ["Rust", "#dea584"], php: ["PHP", "#777bb3"],
    rb: ["Ruby", "#cc342d"], c: ["C", "#6e8fbf"], cpp: ["C++", "#6e8fbf"], cs: ["C#", "#8f5bd6"], kt: ["Kotlin", "#a97bff"], swift: ["Swift", "#f05138"],
  };
  function formatTextSize(text) {
    const bytes = new Blob([text]).size;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  }
  function createFileCard(pre, codeEl, rawCode, language, fileName) {
    const extension = (fileName.match(/\.([\w]+)$/)?.[1] || getCodeExtension(language)).toLowerCase();
    const [kind, tint] = FILE_KINDS[extension] || [language && language !== "text" ? language.toUpperCase() : "File", "#4cc9a4"];
    const lines = rawCode.replace(/\n$/, "").split("\n").length;
    const card = scope.document.createElement("div");
    card.className = "gx-file-card";
    card.style.setProperty("--file-tint", tint);
    card.innerHTML = scope.sanitizeHtml(`<div class="gx-file-card-row"><span class="gx-file-icon"><span></span></span><span class="gx-file-meta"><strong></strong><small></small></span><span class="gx-file-actions"></span></div><div class="gx-file-code"><div class="ai-code-block"></div></div>`);
    card.querySelector(".gx-file-icon span").textContent = extension.slice(0, 4).toUpperCase();
    card.querySelector("strong").textContent = fileName;
    card.querySelector("small").textContent = `${kind} · ${lines} ${lines === 1 ? "line" : "lines"} · ${formatTextSize(rawCode)}`;
    const actions = card.querySelector(".gx-file-actions");
    const toggle = scope.document.createElement("button");
    toggle.type = "button";
    toggle.className = "gx-file-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = scope.sanitizeHtml(`<span>Show code</span><i class="fas fa-chevron-down"></i>`);
    scope.listen(toggle, "click", () => {
      const open = !card.classList.contains("is-open");
      card.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector("span").textContent = open ? "Hide code" : "Show code";
    });
    if (context.workspaceManaged) {
      const open = scope.document.createElement("button");
      open.type = "button";
      open.className = "gx-file-open";
      open.textContent = "Open";
      scope.listen(open, "click", () => openInCanvas(rawCode, normalizeCodeLanguage(language), fileName));
      actions.append(open);
    }
    actions.append(
      toggle,
      createCodeActionButton("fas fa-download", `Download ${fileName}`, () => downloadTextFile(rawCode, fileName)),
      createCodeActionButton("far fa-copy", "Copy code", () => copyTextToClipboard(rawCode)),
    );
    codeEl.innerHTML = scope.sanitizeHtml(highlightCode(rawCode, normalizeCodeLanguage(language)));
    pre.replaceWith(card);
    card.querySelector(".gx-file-code > div").append(pre);
  }
  // Files that follow each other read as one list, like a set of attachments.
  function groupFileCards(root) {
    root.querySelectorAll(".gx-file-card").forEach((card) => {
      if (card.parentElement?.classList.contains("gx-file-stack")) return;
      const previous = card.previousElementSibling;
      if (previous?.classList.contains("gx-file-stack")) { previous.append(card); return; }
      if (card.nextElementSibling?.classList.contains("gx-file-card")) {
        const stack = scope.document.createElement("div");
        stack.className = "gx-file-stack";
        card.replaceWith(stack);
        stack.append(card);
      }
    });
  }
  // ```genyxo-action fences are plugin write actions a model proposed. They run
  // only when the user confirms the exact details shown on this card.
  const ACTION_TINTS = { gmail: "#ea4335", github: "#8b949e", "google-drive": "#1fa463", "google-calendar": "#4285f4", "outlook-email": "#0a64c9", "outlook-calendar": "#0a64c9", "microsoft-teams": "#5059c9", notion: "#9b9a97", zoom: "#0b5cff", dropbox: "#0061ff", canva: "#7d2ae8", linear: "#5e6ad2", atlassian: "#1868db", stripe: "#635bff", paypal: "#0070e0", shopify: "#5e8e3e", gitlab: "#fc6d26", spotify: "#1db954", wix: "#0c6efc", "wordpress-com": "#3858e9", netlify: "#05bdba", railway: "#853bce", supabase: "#3ecf8e", kahoot: "#46178f", linkedin: "#0a66c2" };
  const ACTION_STATUS = { pending: "Needs your confirmation", running: "Running…", done: "Done", failed: "Failed", cancelled: "Cancelled" };
  const actionStates = new Map();
  function createActionCard(pre, rawCode) {
    let card;
    try { card = JSON.parse(rawCode.trim()); } catch { card = null; }
    const element = scope.document.createElement("div");
    element.className = "gx-action-card";
    if (!card?.id) {
      element.classList.add("is-loading");
      element.textContent = "Preparing action…";
      pre.replaceWith(element);
      return;
    }
    const state = { ...card, ...(actionStates.get(card.id) || {}) };
    element.dataset.actionId = card.id;
    element.dataset.status = state.status || "pending";
    element.style.setProperty("--action-tint", ACTION_TINTS[card.plugin] || "var(--gx-accent, #5ee0c4)");
    element.setAttribute("role", "group");
    element.setAttribute("aria-label", `${card.pluginName || "Plugin"} action: ${card.title || "Action"}`);
    element.innerHTML = scope.sanitizeHtml(`<div class="gx-action-head"><span class="gx-action-mark" aria-hidden="true"></span><span class="gx-action-heading"><strong></strong><small></small></span><span class="gx-action-badge"></span></div><dl class="gx-action-fields"></dl><div class="gx-action-foot"><p class="gx-action-result" role="status"></p><span class="gx-action-buttons"><button type="button" class="gx-action-cancel">Cancel</button><button type="button" class="gx-action-confirm">Confirm</button></span></div>`);
    element.querySelector(".gx-action-mark").textContent = (card.pluginName || "?").slice(0, 1);
    element.querySelector(".gx-action-heading strong").textContent = card.title || "Plugin action";
    element.querySelector(".gx-action-heading small").textContent = card.pluginName || "Plugin";
    const fields = element.querySelector(".gx-action-fields");
    for (const field of Array.isArray(card.fields) ? card.fields : []) {
      const row = scope.document.createElement("div");
      const label = scope.document.createElement("dt");
      const value = scope.document.createElement("dd");
      label.textContent = String(field.label || "");
      value.textContent = String(field.value || "");
      row.append(label, value);
      fields.append(row);
    }
    if (card.body) {
      // A div, not <pre>: chat code styles must not restyle the exact message text.
      const body = scope.document.createElement("div");
      body.className = "gx-action-body";
      body.textContent = card.body + (card.bodyTruncated ? "\n…" : "");
      fields.after(body);
    }
    const render = (next) => {
      Object.assign(state, next);
      element.dataset.status = state.status;
      element.querySelector(".gx-action-badge").textContent = ACTION_STATUS[state.status] || state.status;
      const result = element.querySelector(".gx-action-result");
      result.textContent = "";
      if (state.status === "done") {
        result.textContent = state.result?.summary || "Done";
        if (typeof state.result?.url === "string" && /^https:\/\//.test(state.result.url)) {
          const link = scope.document.createElement("a");
          link.href = state.result.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Open ↗";
          result.append(" ", link);
        }
      } else if (state.status === "failed") result.textContent = state.error || state.result?.error || "The action failed.";
      else if (state.status === "cancelled") result.textContent = "Nothing was sent or changed.";
      element.querySelectorAll(".gx-action-buttons button").forEach((button) => { button.disabled = state.status !== "pending"; });
      element.querySelector(".gx-action-buttons").hidden = state.status !== "pending" && state.status !== "running";
    };
    const request = async (path, method = "GET") => {
      const response = await scope.fetch(`${context.API_BASE_URL}/integrations/actions/${encodeURIComponent(card.id)}${path}`, { method, headers: { Authorization: `Bearer ${context.token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || "Request failed"), { status: response.status });
      return { status: data.status, result: data.result, error: data.result?.error };
    };
    const act = async (verb) => {
      const previous = state.status;
      render({ status: verb === "confirm" ? "running" : previous });
      try {
        const next = await request(`/${verb}`, "POST");
        actionStates.set(card.id, next);
        render(next);
      } catch (error) {
        // Another tab may have handled it already: show the real state.
        const latest = error.status === 409 ? await request("").catch(() => null) : null;
        const next = latest || { status: verb === "confirm" && error.status && error.status !== 410 ? "failed" : previous, error: error.message };
        if (error.status === 410) next.status = "cancelled";
        actionStates.set(card.id, next);
        render(next);
        if (!latest) context.showToast?.(error.message, "error");
      }
    };
    scope.listen(element.querySelector(".gx-action-confirm"), "click", () => act("confirm"));
    scope.listen(element.querySelector(".gx-action-cancel"), "click", () => act("cancel"));
    render({});
    pre.replaceWith(element);
  }
  // ```genyxo-media fences are audio and video the chat model generated with
  // its built-in tools. Videos render in the background, so the card polls.
  const mediaStates = new Map();
  const mediaPollers = new Set();
  const MEDIA_LABELS = { video: "Video", speech: "Voice-over", music: "Music" };
  function createMediaCard(pre, rawCode) {
    let card;
    try { card = JSON.parse(rawCode.trim()); } catch { card = null; }
    const element = scope.document.createElement("div");
    element.className = "gx-media-card";
    if (!card?.id || !/^[0-9a-f-]{36}$/i.test(card.id)) {
      element.classList.add("is-loading");
      element.textContent = "Preparing media…";
      pre.replaceWith(element);
      return;
    }
    const src = `${context.API_BASE_URL}/chat/media/${card.id}`;
    element.dataset.kind = card.kind || "media";
    element.innerHTML = scope.sanitizeHtml(`<div class="gx-media-head"><span class="gx-media-kind"></span><span class="gx-media-title"></span><a class="gx-media-download" download>Download</a></div><div class="gx-media-body"></div>`);
    element.querySelector(".gx-media-kind").textContent = MEDIA_LABELS[card.kind] || "Media";
    element.querySelector(".gx-media-title").textContent = card.title || "";
    const download = element.querySelector(".gx-media-download");
    download.href = src;
    const body = element.querySelector(".gx-media-body");
    const render = (status, error) => {
      element.dataset.status = status;
      body.textContent = "";
      download.hidden = status !== "ready";
      if (status === "ready") {
        const player = scope.document.createElement(card.kind === "video" ? "video" : "audio");
        player.controls = true;
        player.preload = "metadata";
        player.src = src;
        if (card.kind === "video") player.playsInline = true;
        body.append(player);
      } else if (status === "failed") {
        body.textContent = error || "Generation failed. Credits were refunded.";
      } else {
        const waiting = scope.document.createElement("span");
        waiting.className = "gx-media-wait";
        waiting.textContent = card.kind === "video" ? "Rendering video… usually 1–3 minutes" : "Generating…";
        body.append(waiting);
      }
    };
    const known = mediaStates.get(card.id);
    render(known?.status || card.status || "ready", known?.error);
    if ((known?.status || card.status) === "pending" && !mediaPollers.has(card.id)) {
      mediaPollers.add(card.id);
      const poll = async () => {
        try {
          const response = await scope.fetch(`${src}/status`);
          const data = await response.json();
          if (data.status && data.status !== "pending") {
            mediaStates.set(card.id, { status: data.status, error: data.error });
            mediaPollers.delete(card.id);
            scope.document.querySelectorAll(".gx-media-card").forEach((node) => node._mediaId === card.id && node._render?.(data.status, data.error));
            return;
          }
        } catch { /* Keep polling through brief network errors. */ }
        scope.setTimeout(poll, 6000);
      };
      scope.setTimeout(poll, 6000);
    }
    element._mediaId = card.id;
    element._render = render;
    pre.replaceWith(element);
  }
  // ```genyxo-map fences are places or a route from the built-in map tools. The
  // React map card mounts into the element; while the answer streams the same
  // element is reused, so the map is not rebuilt on every token.
  const mapCards = new Map();
  function createMapCard(pre, rawCode) {
    const key = rawCode.trim();
    let element = mapCards.get(key);
    if (!element) {
      let data;
      try { data = JSON.parse(key); } catch { data = null; }
      if (!data || (data.type !== "places" && data.type !== "route")) { pre.remove(); return; }
      element = scope.document.createElement("div");
      element.className = "gx-map-card-slot";
      mapCards.set(key, element);
      pre.replaceWith(element);
      scope.document.dispatchEvent(new CustomEvent("genyxo:map-card", { detail: { element, data } }));
      return;
    }
    pre.replaceWith(element);
  }
  // ```genyxo-sources (pages an answer used) and ```genyxo-memory ("Memory updated")
  // become React cards the same way, keyed by their content so streaming keeps them.
  const richCards = new Map();
  function createRichCard(pre, rawCode, kind) {
    const key = `${kind}:${rawCode.trim()}`;
    let element = richCards.get(key);
    if (element) { pre.replaceWith(element); return; }
    let data;
    try { data = JSON.parse(rawCode.trim()); } catch { data = null; }
    if (!data) { pre.remove(); return; }
    element = scope.document.createElement("div");
    element.className = `gx-rich-slot gx-rich-${kind}`;
    richCards.set(key, element);
    pre.replaceWith(element);
    scope.document.dispatchEvent(new CustomEvent("genyxo:rich-card", { detail: { kind, element, data } }));
  }
  function createHighlightedCodeBlock(pre, codeEl, rawCode, language, index) {
    if (/(?:^|\s)language-genyxo-map(?:\s|$)/.test(codeEl?.className || "")) {
      createMapCard(pre, rawCode);
      return;
    }
    const rich = /(?:^|\s)language-genyxo-(sources|memory|task|weather)(?:\s|$)/.exec(codeEl?.className || "");
    if (rich) {
      createRichCard(pre, rawCode, rich[1]);
      return;
    }
    if (/(?:^|\s)language-genyxo-media(?:\s|$)/.test(codeEl?.className || "")) {
      createMediaCard(pre, rawCode);
      return;
    }
    if (/(?:^|\s)language-genyxo-action(?:\s|$)/.test(codeEl?.className || "")) {
      createActionCard(pre, rawCode);
      return;
    }
    const fileName = getCodeFileName(codeEl);
    if (fileName) {
      createFileCard(pre, codeEl, rawCode, language, fileName);
      return;
    }
    const normalizedLanguage = normalizeCodeLanguage(language);
    const wrapper = scope.document.createElement("div");
    wrapper.className = "ai-code-block";
    const header = scope.document.createElement("div");
    header.className = "ai-code-header";
    const label = scope.document.createElement("span");
    label.className = "ai-code-language";
    label.textContent = normalizedLanguage.toUpperCase();
    const actions = scope.document.createElement("div");
    actions.className = "ai-code-actions";
    if (context.workspaceManaged) {
      actions.append(
        createCodeActionButton("fas fa-up-right-from-square", "Open in canvas", () =>
          openInCanvas(rawCode, normalizedLanguage),
        ),
      );
    }
    actions.append(
      createCodeActionButton("fas fa-download", "Download code", () => {
        downloadTextFile(
          rawCode,
          `genyxo-code-${Date.now()}-${index + 1}.${getCodeExtension(normalizedLanguage)}`,
        );
      }),
      createCodeActionButton("far fa-copy", "Copy code", () =>
        copyTextToClipboard(rawCode),
      ),
    );
    header.append(label, actions);
    codeEl.innerHTML = scope.sanitizeHtml(
      highlightCode(rawCode, normalizedLanguage),
    );
    pre.replaceWith(wrapper);
    wrapper.append(header, pre);
  }
  function enhanceCodeBlocks(root, defaultLanguage = "") {
    if (!root) return;
    root.querySelectorAll("pre").forEach((pre, index) => {
      if (pre.closest(".ai-code-block")) return;
      let codeEl = getDirectCodeElement(pre);
      const rawCode = codeEl ? codeEl.textContent || "" : pre.textContent || "";
      if (!rawCode.trim()) return;
      if (!codeEl) {
        pre.textContent = "";
        codeEl = scope.document.createElement("code");
        pre.appendChild(codeEl);
      }
      const normalizedDefaultLanguage = normalizeCodeLanguage(defaultLanguage);
      const language =
        getCodeLanguageFromClass(codeEl) ||
        getCodeLanguageFromPre(pre) ||
        (normalizedDefaultLanguage !== "text"
          ? normalizedDefaultLanguage
          : "") ||
        inferCodeLanguageFromText(rawCode);
      createHighlightedCodeBlock(pre, codeEl, rawCode, language, index);
    });
    groupFileCards(root);
  }
  function looksLikeRawCodeResponse(markdown = "") {
    const trimmed = markdown.trim();
    if (!trimmed || trimmed.includes("```")) return false;
    return (
      /^<!doctype\s+html/i.test(trimmed) ||
      /^<html[\s>]/i.test(trimmed) ||
      /^<style[\s>]/i.test(trimmed) ||
      /^<script[\s>]/i.test(trimmed) ||
      /<\/(html|body|style|script)>/i.test(trimmed)
    );
  }
  function inferCodeLanguageFromText(text = "") {
    const trimmed = text.trim();
    if (
      /^<!doctype\s+html/i.test(trimmed) ||
      /^<html[\s>]/i.test(trimmed) ||
      /<\/(html|head|body|style|script)>/i.test(trimmed)
    )
      return "html";
    if (
      /^<style[\s>]/i.test(trimmed) ||
      /(^|\n)\s*[.#]?[\w-]+\s*\{/.test(trimmed)
    )
      return "css";
    if (
      /^<script[\s>]/i.test(trimmed) ||
      /\b(function|const|let|document|window)\b/.test(trimmed)
    )
      return "javascript";
    if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(trimmed)) return "json";
    return "text";
  }
  function normalizeBotMarkdown(markdown = "") {
    const looseCodeMarkdown = normalizeLooseCodeMarkdown(markdown || "");
    if (looseCodeMarkdown !== (markdown || "")) return looseCodeMarkdown;
    if (!looksLikeRawCodeResponse(markdown)) return markdown || "";
    const language = inferCodeLanguageFromText(markdown);
    return `\`\`\`${language}\n${markdown.trim()}\n\`\`\``;
  }
  function hasOpenMarkdownCodeFence(markdown = "") {
    const matches = markdown.match(/(^|\n)\s*```/g);
    return Boolean(matches && matches.length % 2 === 1);
  }
  function closeOpenMarkdownCodeFence(markdown = "") {
    if (!hasOpenMarkdownCodeFence(markdown)) return markdown;
    return `${markdown.replace(/\s*$/, "")}\n\`\`\``;
  }
  function normalizeLooseCodeMarkdown(markdown = "") {
    if (!markdown || markdown.includes("```")) return markdown;
    const match = markdown.match(
      /(^|\n)(\s*)(<!doctype\s+html|<html[\s>]|<style[\s>]|<script[\s>])/i,
    );
    if (!match || typeof match.index !== "number") return markdown || "";
    const codeStartIndex = match.index + match[1].length;
    const intro = markdown.slice(0, codeStartIndex).trimEnd();
    const code = markdown.slice(codeStartIndex).trim();
    const language = inferCodeLanguageFromText(code);
    return `${intro ? `${intro}\n\n` : ""}\`\`\`${language}\n${code}\n\`\`\``;
  }
  function renderMarkdownInto(element, markdown, options = {}) {
    const sourceMarkdown = options.streaming
      ? closeOpenMarkdownCodeFence(markdown || "")
      : markdown || "";
    const normalizedMarkdown = markFileFences(normalizeBotMarkdown(sourceMarkdown));
    const parsed = DOMPurify.sanitize(marked.parse(normalizedMarkdown));
    element.innerHTML = scope.sanitizeHtml(
      parsed || `<pre><code>${escapeHtml(markdown || "")}</code></pre>`,
    );
    enhanceCodeBlocks(element, inferCodeLanguageFromText(markdown || ""));
  }
  function createStreamingMarkdownRenderer(element, onRender) {
    let animationFrame = 0;
    let renderTimer = 0;
    let latestMarkdown = "";
    let lastRenderAt = 0;
    const minRenderInterval = 90;
    const clearPendingRender = () => {
      if (renderTimer) {
        clearTimeout(renderTimer);
        renderTimer = 0;
      }
      if (animationFrame) {
        if (typeof scope.cancelAnimationFrame === "function") {
          scope.cancelAnimationFrame(animationFrame);
        }
        animationFrame = 0;
      }
    };
    const render = (streaming = true) => {
      lastRenderAt = performance.now();
      if (streaming) element.classList.add("is-streaming-render");
      renderMarkdownInto(element, latestMarkdown, { streaming });
      if (typeof onRender === "function") onRender();
    };
    return {
      update(markdown) {
        latestMarkdown = markdown || "";
        if (renderTimer || animationFrame) return;
        const elapsed = performance.now() - lastRenderAt;
        const delay = Math.max(0, minRenderInterval - elapsed);
        renderTimer = setTimeout(() => {
          renderTimer = 0;
          animationFrame = scope.requestAnimationFrame(() => {
            animationFrame = 0;
            render(true);
          });
        }, delay);
      },
      flush(markdown = latestMarkdown) {
        latestMarkdown = markdown || "";
        clearPendingRender();
        element.classList.remove("is-streaming-render");
        render(false);
      },
    };
  }
  function getPreviousUserMessage(botBubble) {
    let current = botBubble?.previousElementSibling;
    while (current) {
      if (current.classList?.contains("user-message")) return current;
      current = current.previousElementSibling;
    }
    return null;
  }
  function createBotActionButton(iconClass, label, onClick) {
    const button = scope.document.createElement("button");
    button.type = "button";
    button.className = "bot-action-btn";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = scope.sanitizeHtml(`<i class="${iconClass}"></i>`);
    scope.listen(button, "click", onClick);
    return button;
  }
  function rateBotMessage(botBubble, selectedButton, otherButton) {
    if (!botBubble || botBubble.dataset.rated === "true") return;
    botBubble.dataset.rated = "true";
    selectedButton.classList.add("selected");
    selectedButton.setAttribute("aria-pressed", "true");
    otherButton.setAttribute("aria-disabled", "true");
    showReviewToast();
  }
  function closeBotMoreMenus(except = null) {
    scope.document.querySelectorAll(".bot-more-menu.show").forEach((menu) => {
      if (menu !== except) menu.classList.remove("show");
    });
  }
  function getResponseActivity(botBubble, sourcesOnly = false) {
    const steps = sourcesOnly ? [] : (botBubble?._activity || []).map((step) => ({
      title: step,
      body: "",
    }));
    const sources = botBubble?._sources || [];
    if (sources.length) {
      steps.push({ title: "Attached documents used", body: sources.join(", ") });
    }
    if (!steps.length) {
      steps.push({
        title: sourcesOnly ? "No attached documents used" : "Activity unavailable",
        body: sourcesOnly
          ? "No document was included in the context for this response."
          : "This response has no recorded activity details.",
      });
    }
    return steps;
  }
  function recordResponseActivity(botBubble, data) {
    if (data.status === "activity" && typeof data.step === "string") {
      botBubble._activity ||= [];
      if (botBubble._activity.at(-1) !== data.step) botBubble._activity.push(data.step);
      botBubble.dataset.activity = data.step;
      if (Array.isArray(data.sources)) botBubble._sources = data.sources;
    }
    if (data.status === "done") {
      botBubble._activity ||= [];
      botBubble._activity.push("Response saved");
      delete botBubble.dataset.activity;
    }
  }
  function ensureReasoningPanel() {
    let panel = scope.document.getElementById("reasoningPanelOverlay");
    if (panel) return panel;
    panel = scope.document.createElement("div");
    panel.id = "reasoningPanelOverlay";
    panel.className = "reasoning-panel-overlay";
    panel.innerHTML = scope.sanitizeHtml(`
        <aside class="reasoning-panel" role="dialog" aria-modal="true" aria-labelledby="reasoningPanelTitle">
            <div class="reasoning-panel-header">
                <h2 id="reasoningPanelTitle">Response activity</h2>
                <button type="button" class="reasoning-panel-close" aria-label="Close reasoning panel">
                    <i class="fas fa-xmark"></i>
                </button>
            </div>
            <div class="reasoning-panel-body"></div>
        </aside>
    `);
    scope.document.body.appendChild(panel);
    const close = () => panel.classList.remove("show");
    scope.listen(panel.querySelector(".reasoning-panel-close"), "click", close);
    scope.listen(panel, "click", (event) => {
      if (event.target === panel) close();
    });
    return panel;
  }
  function openReasoningPanel(botBubble, sourcesOnly = false) {
    const panel = ensureReasoningPanel();
    panel.querySelector("#reasoningPanelTitle").textContent = sourcesOnly
      ? "Sources used" : "Response activity";
    const body = panel.querySelector(".reasoning-panel-body");
    const steps = getResponseActivity(botBubble, sourcesOnly);
    body.replaceChildren();
    steps.forEach((step, index) => {
      const item = scope.document.createElement("section");
      item.className = "reasoning-step";
      item.innerHTML = scope.sanitizeHtml(`
            <div class="reasoning-step-marker">${index === steps.length - 1 ? '<i class="fas fa-check"></i>' : ""}</div>
            <div class="reasoning-step-content">
                <h3></h3>
                <p></p>
            </div>
        `);
      item.querySelector("h3").textContent = step.title;
      item.querySelector("p").textContent = step.body;
      body.appendChild(item);
    });
    panel.classList.add("show");
  }
  function openInCanvas(content, language, title) {
    scope.document.dispatchEvent(new CustomEvent("genyxo:canvas-open", { detail: { content, language, title } }));
  }
  // Like Claude artifacts: a substantial previewable block gets a card and opens beside the chat.
  function findCanvasArtifact(markdown = "") {
    const blocks = [...markdown.matchAll(/```([\w#+.-]*)[^\n]*\n([\s\S]*?)```/g)];
    const previewable = blocks
      .map((match) => ({ language: normalizeCodeLanguage(match[1]), content: match[2].replace(/\n$/, "") }))
      .filter((block) => ["html", "svg", "jsx", "tsx", "react"].includes(block.language) && block.content.split("\n").length >= 12);
    return previewable.sort((a, b) => b.content.length - a.content.length)[0] || null;
  }
  function attachCanvasCard(botBubble, markdown, autoOpen) {
    if (!context.workspaceManaged || botBubble.querySelector(".gx-canvas-card")) return;
    const artifact = findCanvasArtifact(markdown);
    if (!artifact) return;
    const card = scope.document.createElement("button");
    card.type = "button";
    card.className = "gx-canvas-card";
    const kind = artifact.language === "html" ? "HTML page" : artifact.language === "svg" ? "SVG graphic" : "React component";
    card.innerHTML = scope.sanitizeHtml(`<span class="gx-canvas-card-icon"><i class="fas fa-code"></i></span><span><strong></strong><small></small></span><span class="gx-canvas-card-cta">Open ↗</span>`);
    card.querySelector("strong").textContent = kind;
    card.querySelector("small").textContent = `${artifact.content.split("\n").length} lines · Preview and edit in canvas`;
    scope.listen(card, "click", () => openInCanvas(artifact.content, artifact.language));
    const content = botBubble.querySelector(".message-content");
    content?.appendChild(card);
    if (autoOpen && isChatPath(scope.window.location.pathname)) openInCanvas(artifact.content, artifact.language);
  }
  function toggleReadAloud(text, item) {
    const synth = scope.window.speechSynthesis;
    if (!synth) {
      context.showToast?.("Read aloud is not supported in this browser.", "error");
      return;
    }
    if (synth.speaking) {
      synth.cancel();
      return;
    }
    // Speak the visible prose, not Markdown syntax.
    const plain = text.replace(/```[\s\S]*?```/g, " code block ").replace(/[#*_`>|~-]+/g, " ");
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = scope.document.documentElement.lang || "en";
    item?.classList.add("is-speaking");
    utterance.onend = utterance.onerror = () => item?.classList.remove("is-speaking");
    synth.speak(utterance);
  }
  function describeTurnError(message = "") {
    if (/429|rate.?limit|busy|overloaded/i.test(message)) return "The model is busy right now. Try again in a moment or choose another model.";
    if (/404|unavailable|not found|not supported/i.test(message)) return "This model isn't available right now. Choose another model and try again.";
    if (/401|403|auth|api key|permission/i.test(message)) return "The model provider rejected the request. Try another model.";
    if (/timeout|network|failed to fetch|connection/i.test(message)) return "The connection dropped before the answer arrived.";
    return "The model couldn't answer this message.";
  }
  function showTurnError(botBubble, message, onRetry, onEdit) {
    botBubble.classList.remove("streaming");
    botBubble.classList.add("gx-turn-failed");
    botBubble.querySelector(".bot-message-actions")?.remove();
    botBubble.querySelector(".message-meta")?.remove();
    const content = botBubble.querySelector(".message-content") || botBubble;
    content.style.color = "";
    content.innerHTML = scope.sanitizeHtml(`
      <div class="gx-turn-error" role="alert">
        <span class="gx-turn-error-icon" aria-hidden="true"><i class="fas fa-triangle-exclamation"></i></span>
        <div class="gx-turn-error-copy"><strong></strong><small></small></div>
        <div class="gx-turn-error-actions">
          <button type="button" class="gx-retry-btn"><i class="fas fa-rotate-right" aria-hidden="true"></i><span>Retry</span></button>
          <button type="button" class="gx-edit-btn"><span>Edit</span></button>
        </div>
      </div>`);
    content.querySelector("strong").textContent = describeTurnError(message);
    content.querySelector("small").textContent = message;
    scope.listen(content.querySelector(".gx-retry-btn"), "click", onRetry);
    scope.listen(content.querySelector(".gx-edit-btn"), "click", onEdit);
  }
  function stopGeneration() {
    if (!activeSendController) return false;
    // Leaving the page keeps a reply generating on the server, so Stop has to say so.
    const target = {
      conversationId: currentChatId ? Number(currentChatId) : undefined,
      clientRequestId: pendingFirstSend?.id,
    };
    if (context.token && (target.conversationId || target.clientRequestId)) {
      scope.fetch(`${context.API_BASE_URL}/chat/workspace/stop`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${context.token}` },
        body: JSON.stringify(target),
      }).catch(() => {});
    }
    activeSendController.abort();
    return true;
  }
  // A reply that kept generating after the page was left: the chat shows it is
  // still coming, and loads it once the server has saved it.
  function showPendingReply() {
    const bubble = appendMessage("bot", "");
    const content = bubble?.querySelector(".message-content");
    if (!bubble || !content) return;
    bubble.classList.add("gx-pending-reply");
    bubble.dataset.activity = "Still answering";
    content.innerHTML = scope.sanitizeHtml('<div class="chat-loader" aria-label="AI is still answering"></div>');
    scrollToBottom(true);
  }
  function createBotActions(botBubble) {
    const actions = scope.document.createElement("div");
    actions.className = "bot-message-actions";
    const moreWrap = scope.document.createElement("div");
    moreWrap.className = "bot-more-wrap";
    const moreMenu = scope.document.createElement("div");
    moreMenu.className = "bot-more-menu";
    moreMenu.innerHTML = scope.sanitizeHtml(`
        <button type="button" data-action="canvas"><i class="fas fa-up-right-from-square"></i><span>Open in canvas</span></button>
        <button type="button" data-action="listen"><i class="fas fa-volume-high"></i><span>Read aloud</span></button>
        <button type="button" data-action="download"><i class="fas fa-download"></i><span>Download as Markdown</span></button>
        <button type="button" data-action="report"><i class="far fa-flag"></i><span>Report a problem</span></button>
        <button type="button" data-action="sources"><i class="fas fa-link"></i><span>View sources</span></button>
        <button type="button" data-action="reasoning"><i class="fas fa-timeline"></i><span>Response activity</span></button>
    `);
    scope.listen(moreMenu, "click", (event) => {
      const item = event.target.closest("button");
      if (!item) return;
      if (item.dataset.action === "reasoning") {
        openReasoningPanel(botBubble);
        moreMenu.classList.remove("show");
        return;
      }
      if (item.dataset.action === "sources") {
        openReasoningPanel(botBubble, true);
        moreMenu.classList.remove("show");
        return;
      }
      const answer = botBubble._botText || botBubble.textContent || "";
      if (item.dataset.action === "canvas") openInCanvas(answer, "markdown");
      if (item.dataset.action === "listen") toggleReadAloud(answer, item);
      if (item.dataset.action === "download") {
        const url = URL.createObjectURL(new Blob([answer], { type: "text/markdown" }));
        const link = scope.document.createElement("a");
        link.href = url;
        link.download = "genyxo-answer.md";
        link.click();
        URL.revokeObjectURL(url);
      }
      if (item.dataset.action === "report") {
        scope.window.location.href = `mailto:info@genyxo.com?subject=${encodeURIComponent("Genyxo answer report")}&body=${encodeURIComponent(`Conversation: ${currentChatId || "new"}\nMessage: ${botBubble.dataset.messageId || "unsaved"}\n\nWhat went wrong:\n`)}`;
      }
      moreMenu.classList.remove("show");
    });
    const moreBtn = createBotActionButton(
      "fas fa-ellipsis",
      "More",
      (event) => {
        event.stopPropagation();
        const willShow = !moreMenu.classList.contains("show");
        closeBotMoreMenus(moreMenu);
        moreMenu.classList.toggle("show", willShow);
      },
    );
    moreWrap.append(moreBtn, moreMenu);
    const likeBtn = createBotActionButton("far fa-thumbs-up", "Like", () =>
      rateBotMessage(botBubble, likeBtn, dislikeBtn),
    );
    const dislikeBtn = createBotActionButton(
      "far fa-thumbs-down",
      "Dislike",
      () => rateBotMessage(botBubble, dislikeBtn, likeBtn),
    );
    const compareBtn = createBotActionButton("fas fa-columns", "Compare answers", () => showComparison(botBubble));
    compareBtn.hidden = true;
    actions.append(
      likeBtn,
      dislikeBtn,
      createBotActionButton("fas fa-wand-magic-sparkles", "Answer with another model", () => openAlternativePicker(botBubble)),
      compareBtn,
      createBotActionButton("far fa-bookmark", "Save as document", () => saveAnswerToLibrary(botBubble)),
      createBotActionButton("far fa-copy", "Copy response", () =>
        copyTextToClipboard(botBubble._botText || botBubble.textContent || ""),
      ),
      moreWrap,
    );
    return actions;
  }
  function getModelIconSrc(value = "") {
    if (value.includes("dall-e")) return "/images/dalle-text.png";
    if (value.includes("google/gemini") || value.includes("gemma"))
      return "/images/google-gemini.svg";
    if (value.includes("openai") || value.includes("gpt"))
      return "/images/openai-mark.svg";
    if (value.includes("anthropic") || value.includes("claude"))
      return "/images/claude-ai.svg";
    if (value.includes("nvidia/")) return "/images/nvidia-icon.svg";
    if (value.includes("kling")) return "/images/kling-video.svg";
    return "/images/logo.svg";
  }
  function getModelProviderName(value = "") {
    if (value.includes("google/gemini") || value.includes("gemma"))
      return "Gemini";
    if (value.includes("openai") || value.includes("gpt")) return "OpenAI";
    if (value.includes("anthropic") || value.includes("claude"))
      return "Claude";
    if (value.includes("nvidia/")) return "NVIDIA";
    if (value.includes("kling")) return "Kling";
    return "AI";
  }
  // A scheduled task's run shows as a quiet header with the task's name (as in
  // ChatGPT) instead of a user bubble; it opens to the instruction it ran.
  function appendTaskRun(text, messageId) {
    let task;
    try { task = JSON.parse(text.replace(/^```genyxo-task-run\n/, "").replace(/\n```\s*$/, "")); } catch { task = null; }
    if (!task) return null;
    const row = scope.document.createElement("div");
    row.className = "message task-run-message";
    if (messageId) row.dataset.messageId = String(messageId);
    const toggle = scope.document.createElement("button");
    toggle.type = "button";
    toggle.className = "gx-task-run";
    toggle.setAttribute("aria-expanded", "false");
    const title = scope.document.createElement("span");
    title.textContent = String(task.title || "Scheduled task");
    const chevron = scope.document.createElement("i");
    chevron.className = "fas fa-chevron-right";
    chevron.setAttribute("aria-hidden", "true");
    toggle.append(title, chevron);
    const prompt = scope.document.createElement("p");
    prompt.className = "gx-task-run-prompt";
    prompt.textContent = String(task.prompt || "");
    prompt.hidden = true;
    scope.listen(toggle, "click", () => {
      prompt.hidden = !prompt.hidden;
      toggle.setAttribute("aria-expanded", String(!prompt.hidden));
    });
    row.append(toggle, prompt);
    chatBox.appendChild(row);
    return row;
  }
  function appendMessage(sender, text, model = "", files = [], activity = [], sources = [], messageId = null, alternativeToMessageId = null) {
    if (sender === "user" && typeof text === "string" && text.startsWith("```genyxo-task-run\n")) {
      const row = appendTaskRun(text, messageId);
      if (row) return row;
    }
    const msgDiv = scope.document.createElement("div");
    msgDiv.className = `message ${sender}-message ${model ? "model-" + model.replace("/", "-") : ""}`;
    msgDiv._messageText = text || "";
    msgDiv._messageFiles = files || [];
    msgDiv._messageModel = model || "";
    msgDiv._activity = Array.isArray(activity) ? activity : [];
    msgDiv._sources = Array.isArray(sources) ? sources : [];
    if (messageId) msgDiv.dataset.messageId = String(messageId);
    if (alternativeToMessageId) msgDiv.dataset.alternativeTo = String(alternativeToMessageId);
    const contentDiv = scope.document.createElement("div");
    contentDiv.className = "message-content";

    // 1. Отрисовка прикрепленных файлов (если они есть и это сообщение пользователя)
    if (files && files.length > 0 && sender === "user") {
      const filesContainer = scope.document.createElement("div");
      filesContainer.className = "message-attachments";
      files.forEach((file) => {
        const mimeType = getAttachmentMime(file);
        const fileName = getAttachmentName(file);
        const imageSrc = mimeType.startsWith("image/")
          ? getAttachmentImageSrc(file)
          : "";
        if (imageSrc) {
          const img = scope.document.createElement("img");
          img.src = imageSrc;
          img.alt = fileName;
          img.title = fileName;
          img.className = "chat-image-preview";
          img.tabIndex = 0;
          scope.listen(img, "click", () => openFileInspector(file, img.src));
          scope.listen(img, "keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFileInspector(file, img.src);
            }
          });
          filesContainer.appendChild(img);
        } else {
          const fileLink = scope.document.createElement("button");
          fileLink.type = "button";
          fileLink.className = "chat-file-preview";
          fileLink.title = `Open ${fileName}`;
          const icon = scope.document.createElement("i");
          icon.className = getAttachmentIcon(file);
          const info = scope.document.createElement("span");
          info.className = "chat-file-info";
          const name = scope.document.createElement("span");
          name.className = "chat-file-name";
          name.textContent = fileName;
          const kind = scope.document.createElement("span");
          kind.className = "chat-file-kind";
          kind.textContent = getAttachmentKind(file);
          info.append(name, kind);
          fileLink.append(icon, info);
          const size = getAttachmentSize(file);
          if (size) {
            const sizeEl = scope.document.createElement("span");
            sizeEl.className = "chat-file-size";
            sizeEl.textContent = size;
            fileLink.appendChild(sizeEl);
          }
          scope.listen(fileLink, "click", () => openFileInspector(file));
          filesContainer.appendChild(fileLink);
        }
      });
      contentDiv.appendChild(filesContainer);
    }

    // 2. Отрисовка текста (чтобы он не затирал картинки)
    const textContainer = scope.document.createElement("div");
    textContainer.className = `message-text ${sender === "user" ? "user-message-text" : "bot-message-text"}`;
    if (sender === "bot") {
      msgDiv._botText = text || "";
      renderMarkdownInto(textContainer, text || "");
    } else {
      if (text) {
        textContainer.textContent = text;
      }
    }
    if (text || sender === "bot") {
      contentDiv.appendChild(textContainer);
    }
    if (sender === "user") {
      const actions = scope.document.createElement("div");
      actions.className = "user-message-actions";
      const shouldCollapse =
        text && (text.length > 420 || text.split("\n").length > 8);
      if (shouldCollapse) {
        textContainer.classList.add("is-collapsed");
        const expandBtn = scope.document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "message-action-btn expand-message-btn";
        expandBtn.innerHTML = scope.sanitizeHtml(
          '<i class="fas fa-chevron-down"></i><span>Expand text</span>',
        );
        scope.listen(expandBtn, "click", () => {
          const collapsed = textContainer.classList.toggle("is-collapsed");
          expandBtn.innerHTML = scope.sanitizeHtml(
            collapsed
              ? '<i class="fas fa-chevron-down"></i><span>Expand text</span>'
              : '<i class="fas fa-chevron-up"></i><span>Collapse text</span>',
          );
          scrollToBottom();
        });
        actions.appendChild(expandBtn);
      }
      if (text) {
        const editBtn = scope.document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "message-action-btn edit-message-btn";
        editBtn.setAttribute("aria-label", "Edit in composer");
        editBtn.title = "Edit in composer";
        editBtn.innerHTML = scope.sanitizeHtml('<i class="fas fa-pen"></i>');
        scope.listen(editBtn, "click", () => {
          if (!userInput || userInput.disabled) return;
          userInput.value = text;
          userInput.dispatchEvent(new Event("input", { bubbles: true }));
          userInput.focus();
          userInput.setSelectionRange(text.length, text.length);
        });
        actions.appendChild(editBtn);
      }
      const copyBtn = scope.document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "message-action-btn copy-message-btn";
      copyBtn.setAttribute("aria-label", "Copy message");
      copyBtn.title = "Copy message";
      copyBtn.innerHTML = scope.sanitizeHtml('<i class="far fa-copy"></i>');
      scope.listen(copyBtn, "click", () =>
        copyTextToClipboard(buildCopyableUserMessage(text, files)),
      );
      actions.appendChild(copyBtn);
      contentDiv.appendChild(actions);
    }
    msgDiv.appendChild(contentDiv);
    if (sender === "bot" && text) attachCanvasCard(msgDiv, text, false);
    if (sender === "bot") {
      scope.document
        .querySelectorAll(".latest-bot-message")
        .forEach((message) => {
          message.classList.remove("latest-bot-message");
        });
      msgDiv.classList.add("latest-bot-message");
      msgDiv.appendChild(createBotActions(msgDiv));
    }
    if (model) {
      const meta = scope.document.createElement("div");
      meta.className = "message-meta";
      meta.textContent = model;
      msgDiv.appendChild(meta);
    }
    const original = alternativeToMessageId
      ? Array.from(chatBox.querySelectorAll(".bot-message")).find((item) => item.dataset.messageId === String(alternativeToMessageId))
      : null;
    if (original) {
      let lastVariant = original;
      while (lastVariant.nextElementSibling?.dataset.alternativeTo === String(alternativeToMessageId))
        lastVariant = lastVariant.nextElementSibling;
      lastVariant.insertAdjacentElement("afterend", msgDiv);
    } else {
      chatBox.appendChild(msgDiv);
    }
    scrollToBottom();
    return msgDiv;
  }
  async function selectChat(id) {
    if (!id || id === "null") {
      startNewChat();
      return;
    }
    if (currentChatId === id) return;
    activePresetId = undefined;
    pendingFirstSend = null;
    chatViewRevision++;
    const revision = chatViewRevision;
    activeSendController?.abort();
    activeSendController = null;
    userInput.disabled = false;
    sendBtn.disabled = false;
    currentChatId = id;
    setActiveProject(conversations.find((item) => String(item.id) === String(id))?.projectId || null);
    renderHistoryList();
    toggleChatView(true);
    updateUrl(id);
    try {
      const res = await scope.fetch(
        `${context.API_BASE_URL}/chat/history/${id}`,
        {
          headers: {
            Authorization: `Bearer ${context.token}`,
          },
        },
      );
      if (res.ok) {
        const messages = await res.json();
        if (revision !== chatViewRevision) return;
        if (DOM.chatBox) DOM.chatBox.innerHTML = scope.sanitizeHtml("");
        if (messages && messages.length > 0) {
          messages.forEach((msg) =>
            appendMessage(msg.sender, msg.content, msg.model, msg.files || [], msg.activity, msg.sources, msg.id, msg.alternativeToMessageId),
          );
          refreshVariantActions();
        }
        if (scope.window.genyxoGenerating?.has(Number(id)) && !activeSendController) showPendingReply();
        scrollToBottom(true);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }
  async function loadConversations() {
    try {
      if (context.workspaceManaged) {
        const snapshot = await scope.fetch(`${context.API_BASE_URL}/chat/workspace`, { headers: { Authorization: `Bearer ${context.token}` } });
        if (!snapshot.ok) throw new Error("Unable to load workspace");
        const data = await snapshot.json();
        conversations = Array.isArray(data.conversations) ? data.conversations : [];
        rememberChatKeys(conversations);
        projects = Array.isArray(data.projects) ? data.projects : [];
        setActiveProject(activeProjectId);
        publishWorkspaceState();
        return;
      }
      const res = await scope.fetch(
        `${context.API_BASE_URL}/chat/conversations`,
        {
          headers: {
            Authorization: `Bearer ${context.token}`,
          },
        },
      );
      if (res.ok) {
        conversations = await res.json();
        renderHistoryList();
        await loadProjects();
      }
    } catch (e) {
      console.error(e);
    }
  }
  async function workspaceRequest(path, options = {}) {
    if (!context.token) throw new Error("Sign in to use your workspace");
    const response = await scope.fetch(`${context.API_BASE_URL}/chat/${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${context.token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || "Request failed");
    return data;
  }
  function showWorkspaceDialog(title, content) {
    const dialog = scope.document.createElement("dialog");
    dialog.className = "workspace-dialog";
    const header = scope.document.createElement("header");
    const heading = scope.document.createElement("h2");
    heading.textContent = title;
    const close = scope.document.createElement("button");
    close.type = "button";
    close.className = "workspace-dialog-close";
    close.setAttribute("aria-label", "Close dialog");
    close.textContent = "×";
    header.append(heading, close);
    dialog.append(header, content);
    scope.document.body.appendChild(dialog);
    const dismiss = () => { dialog.close(); dialog.remove(); };
    close.addEventListener("click", dismiss);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); dismiss(); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dismiss(); });
    dialog.showModal();
    scope.cleanup(() => dialog.remove());
    return { dialog, dismiss };
  }
  function variantGroup(botBubble) {
    const originalId = botBubble.dataset.alternativeTo || botBubble.dataset.messageId;
    return Array.from(chatBox.querySelectorAll(".bot-message")).filter((item) =>
      item.dataset.messageId === originalId || item.dataset.alternativeTo === originalId,
    );
  }
  function refreshVariantActions() {
    chatBox.querySelectorAll(".bot-message").forEach((item) => {
      const compare = item.querySelector('[aria-label="Compare answers"]');
      if (compare) compare.hidden = variantGroup(item).length < 2;
      if (item.dataset.alternativeTo && !item.querySelector(".variant-label")) {
        const label = scope.document.createElement("span");
        label.className = "variant-label";
        label.textContent = "Alternative answer";
        item.prepend(label);
      }
    });
  }
  function showComparison(botBubble) {
    const group = variantGroup(botBubble);
    if (group.length < 2) return;
    const content = scope.document.createElement("div");
    content.className = "answer-comparison";
    const cards = [0, 1].map((index) => {
      const card = scope.document.createElement("section");
      card.className = "comparison-card";
      const select = scope.document.createElement("select");
      select.setAttribute("aria-label", index ? "Right answer" : "Left answer");
      group.forEach((item, optionIndex) => {
        const option = scope.document.createElement("option");
        option.value = String(optionIndex);
        const modelName = Array.from(modelSelect.options).find((model) => model.value === item._messageModel)?.textContent || item._messageModel || "AI";
        option.textContent = `${optionIndex ? "Alternative" : "Original"} · ${modelName}`;
        select.appendChild(option);
      });
      select.value = String(index);
      const body = scope.document.createElement("div");
      body.className = "comparison-body";
      const render = () => renderMarkdownInto(body, group[Number(select.value)]._botText || "");
      select.addEventListener("change", render);
      render();
      card.append(select, body);
      return card;
    });
    content.append(...cards);
    showWorkspaceDialog("Compare answers", content);
  }
  function openAlternativePicker(botBubble) {
    const originalId = botBubble.dataset.alternativeTo || botBubble.dataset.messageId;
    if (!originalId) return context.showToast("This answer is still being saved", "info");
    const originalBubble = variantGroup(botBubble).find((item) => item.dataset.messageId === originalId) || botBubble;
    const content = scope.document.createElement("div");
    content.className = "alternative-form";
    const intro = scope.document.createElement("p");
    intro.textContent = "Ask another model the same question. Both answers will stay in this chat.";
    const select = scope.document.createElement("select");
    select.setAttribute("aria-label", "Choose another model");
    Array.from(modelSelect.options).filter((option) =>
      option.value !== originalBubble._messageModel &&
      !/dall-e|kling|embedding|robotics|audio|live-translate/.test(option.value),
    ).forEach((option) => {
      const item = scope.document.createElement("option");
      item.value = option.value;
      item.textContent = option.textContent;
      select.appendChild(item);
    });
    const submit = scope.document.createElement("button");
    submit.className = "workspace-primary-btn";
    submit.textContent = "Generate alternative";
    content.append(intro, select, submit);
    const { dismiss } = showWorkspaceDialog("Answer with another model", content);
    submit.addEventListener("click", async () => {
      submit.disabled = true;
      submit.textContent = "Generating…";
      try {
        const result = await workspaceRequest("alternative", { method: "POST", body: JSON.stringify({ messageId: Number(originalId), model: select.value }) });
        appendMessage("bot", result.content, result.model, [], result.activity, result.sources, result.id, result.alternativeToMessageId);
        refreshVariantActions();
        dismiss();
      } catch (error) {
        context.showToast(error.message, "error");
        submit.disabled = false;
        submit.textContent = "Generate alternative";
      }
    });
  }
  async function saveAnswerToLibrary(botBubble) {
    if (!botBubble.dataset.messageId) return context.showToast("Wait until this answer is saved", "info");
    try {
      await workspaceRequest("library", { method: "POST", body: JSON.stringify({
        name: `Answer · ${new Date().toLocaleDateString("en-US")}.md`,
        type: "document", content: botBubble._botText || "", sourceMessageId: Number(botBubble.dataset.messageId),
      }) });
      context.showToast("Saved to Library", "success");
    } catch (error) { context.showToast(error.message, "error"); }
  }
  function setActiveProject(id) {
    activeProjectId = id ? Number(id) : null;
    const project = projects.find((item) => item.id === activeProjectId);
    const badge = scope.document.getElementById("activeProjectBtn");
    if (badge) {
      // The workspace sidebar already marks the chat's project, as in ChatGPT.
      badge.hidden = context.workspaceManaged || !project;
      badge.textContent = project ? `⌁ ${project.name}` : "";
      badge.title = project ? `Project: ${project.name}` : "";
    }
    renderProjectSidebar();
  }
  function renderProjectSidebar() {
    if (context.workspaceManaged) return;
    const list = scope.document.getElementById("projectSidebarList");
    if (!list) return;
    list.replaceChildren();
    if (!projects.length) {
      const empty = scope.document.createElement("button");
      empty.type = "button";
      empty.className = "project-sidebar-empty";
      empty.textContent = "Create your first project";
      empty.addEventListener("click", () => openProjectsPanel());
      list.appendChild(empty);
    }
    projects.forEach((project) => {
      const row = scope.document.createElement("div");
      row.className = "project-sidebar-row";
      const button = scope.document.createElement("button");
      button.type = "button";
      button.className = "project-sidebar-item";
      button.classList.toggle("is-active", project.id === activeProjectId);
      button.innerHTML = scope.sanitizeHtml('<i class="far fa-folder" aria-hidden="true"></i><span></span>');
      button.querySelector("span").textContent = project.name;
      button.addEventListener("click", () => {
        startNewChat();
        setActiveProject(project.id);
        userInput?.focus();
      });
      const more = scope.document.createElement("button");
      more.type = "button";
      more.className = "project-sidebar-more";
      more.setAttribute("aria-label", `Manage ${project.name}`);
      more.innerHTML = scope.sanitizeHtml('<i class="fas fa-ellipsis-h" aria-hidden="true"></i>');
      more.addEventListener("click", () => openProjectsPanel({ focusProjectId: project.id }));
      row.append(button, more);
      list.appendChild(row);
      const chats = conversations.filter((chat) => Number(chat.projectId) === Number(project.id));
      if (chats.length) {
        const chatList = scope.document.createElement("div");
        chatList.className = "project-sidebar-chats";
        chatList.setAttribute("aria-label", `${project.name} chats`);
        chats.slice(0, 8).forEach((chat) => {
          const chatButton = scope.document.createElement("button");
          chatButton.type = "button";
          chatButton.className = "project-sidebar-chat";
          chatButton.classList.toggle("is-active", String(chat.id) === String(currentChatId));
          chatButton.textContent = chat.title || "New chat";
          chatButton.title = chat.title || "New chat";
          chatButton.addEventListener("click", () => selectChat(chat.id));
          chatList.appendChild(chatButton);
        });
        list.appendChild(chatList);
      }
    });
  }
  async function loadProjects() {
    if (!context.token) return;
    try {
      projects = await workspaceRequest("projects");
      renderProjectSidebar();
      if (activeProjectId) setActiveProject(activeProjectId);
    } catch (error) { console.error("Could not load projects", error); }
  }
  function projectEditor(project, onSaved) {
    const form = scope.document.createElement("form");
    form.className = "project-editor";
    form.innerHTML = `
      <label>Project name<input name="name" required maxlength="100" placeholder="e.g. Research workspace"></label>
      <label>Project instructions<textarea name="instructions" maxlength="8000" rows="5" placeholder="Tell models how to work in this project"></textarea></label>
      <label>Shared files <span class="field-note">Adding files here replaces the current set · PDF, DOCX or text · up to 5</span><input name="files" type="file" multiple accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.js,.ts,.py,.xml,.yaml,.yml"></label>
      <div class="existing-project-files"></div>
      <button type="button" class="workspace-subtle-btn" data-clear-files hidden>Remove shared files</button>
      <button type="submit" class="workspace-primary-btn">Save project</button>
    `;
    const nameInput = form.querySelector('input[name="name"]');
    const instructionsInput = form.querySelector('textarea[name="instructions"]');
    const filesInput = form.querySelector('input[name="files"]');
    nameInput.value = project?.name || "";
    instructionsInput.value = project?.instructions || "";
    const fileNames = (project?.files || []).map((file) => file.name);
    const fileLabel = form.querySelector(".existing-project-files");
    fileLabel.textContent = fileNames.length ? `Shared now: ${fileNames.join(", ")}` : "No shared files yet";
    const clear = form.querySelector("[data-clear-files]");
    clear.hidden = !fileNames.length;
    let clearFiles = false;
    clear.addEventListener("click", () => {
      clearFiles = true;
      fileLabel.textContent = "Shared files will be removed";
      clear.hidden = true;
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Saving…";
      try {
        const body = { name: nameInput.value.trim(), instructions: instructionsInput.value.trim() };
        const files = Array.from(filesInput.files || []);
        if (files.length) body.files = await Promise.all(files.map(buildAttachmentPayload));
        else if (clearFiles) body.files = [];
        await workspaceRequest(project ? `projects/${project.id}` : "projects", {
          method: project ? "PATCH" : "POST", body: JSON.stringify(body),
        });
        await loadProjects();
        onSaved();
      } catch (error) {
        context.showToast(error.message, "error");
        submit.disabled = false;
        submit.textContent = "Save project";
      }
    });
    return form;
  }
  async function openProjectsPanel({ focusProjectId } = {}) {
    if (!context.token) return context.showToast("Sign in to use Projects", "info");
    await loadProjects();
    const content = scope.document.createElement("div");
    content.className = "workspace-panel-content";
    const { dismiss } = showWorkspaceDialog("Projects", content);
    const render = () => {
      content.replaceChildren();
      const intro = scope.document.createElement("p");
      intro.className = "workspace-intro";
      intro.textContent = "Keep chats, shared documents and model instructions together.";
      const create = scope.document.createElement("button");
      create.className = "workspace-primary-btn";
      create.textContent = "+ New project";
      create.addEventListener("click", () => content.replaceChildren(projectEditor(null, render)));
      content.append(intro, create);
      projects.forEach((project) => {
        const row = scope.document.createElement("article");
        row.className = "workspace-project-card";
        if (focusProjectId === project.id) row.classList.add("is-highlighted");
        const detail = scope.document.createElement("div");
        const name = scope.document.createElement("h3");
        name.textContent = project.name;
        const info = scope.document.createElement("p");
        info.textContent = `${project.files?.length || 0} shared files · ${conversations.filter((chat) => chat.projectId === project.id).length} chats`;
        detail.append(name, info);
        const actions = scope.document.createElement("div");
        actions.className = "workspace-row-actions";
        const open = scope.document.createElement("button");
        open.textContent = "New chat";
        open.addEventListener("click", () => { startNewChat(); setActiveProject(project.id); dismiss(); userInput.focus(); });
        const edit = scope.document.createElement("button");
        edit.textContent = "Edit";
        edit.addEventListener("click", () => content.replaceChildren(projectEditor(project, render)));
        const remove = scope.document.createElement("button");
        remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          if (remove.dataset.confirm !== "true") {
            remove.dataset.confirm = "true";
            remove.textContent = "Confirm delete";
            return;
          }
          try { await workspaceRequest(`projects/${project.id}`, { method: "DELETE" }); await loadProjects(); render(); }
          catch (error) { context.showToast(error.message, "error"); }
        });
        actions.append(open, edit, remove);
        if (currentChatId && activeProjectId !== project.id) {
          const move = scope.document.createElement("button");
          move.textContent = "Move current chat";
          move.addEventListener("click", async () => {
            try {
              await workspaceRequest(`conversations/${currentChatId}/project`, { method: "PATCH", body: JSON.stringify({ projectId: project.id }) });
              const chat = conversations.find((item) => String(item.id) === String(currentChatId));
              if (chat) chat.projectId = project.id;
              setActiveProject(project.id);
              renderHistoryList();
              dismiss();
            } catch (error) { context.showToast(error.message, "error"); }
          });
          actions.prepend(move);
        }
        row.append(detail, actions);
        content.appendChild(row);
      });
    };
    render();
    if (focusProjectId) content.querySelector(".workspace-project-card.is-highlighted")?.scrollIntoView({ block: "nearest" });
  }
  async function openLibraryPanel() {
    if (!context.token) return context.showToast("Sign in to use Library", "info");
    const content = scope.document.createElement("div");
    content.className = "workspace-panel-content";
    showWorkspaceDialog("Library", content);
    const render = async () => {
      content.textContent = "Loading your library…";
      try {
        const items = await workspaceRequest("library");
        content.replaceChildren();
        const intro = scope.document.createElement("p");
        intro.className = "workspace-intro";
        intro.textContent = "Your generated images, videos and saved answers in one place.";
        content.appendChild(intro);
        if (!items.length) {
          const empty = scope.document.createElement("p");
          empty.className = "workspace-empty";
          empty.textContent = "Nothing saved yet. Generate an image or save an answer to start your library.";
          content.appendChild(empty);
        }
        const grid = scope.document.createElement("div");
        grid.className = "library-grid";
        items.forEach((item) => {
          const card = scope.document.createElement("article");
          card.className = "library-card";
          const media = scope.document.createElement("div");
          media.className = "library-media";
          if (item.type === "image" && /^https?:\/\//i.test(item.url || "")) {
            const img = scope.document.createElement("img");
            img.src = item.url;
            img.alt = item.name;
            media.appendChild(img);
          } else {
            const icon = scope.document.createElement("i");
            icon.className = item.type === "video" ? "fas fa-play" : "far fa-file-lines";
            media.appendChild(icon);
          }
          const name = scope.document.createElement("h3");
          name.textContent = item.name;
          const actions = scope.document.createElement("div");
          actions.className = "workspace-row-actions";
          const open = scope.document.createElement("button");
          open.textContent = item.type === "document" ? "Open" : "View";
          open.addEventListener("click", async () => {
            if (item.type !== "document") {
              if (/^https?:\/\//i.test(item.url || "")) scope.window.open(item.url, "_blank", "noopener,noreferrer");
              return;
            }
            try {
              const documentItem = await workspaceRequest(`library/document/${item.id}`);
              const file = new Blob([documentItem.content || ""], { type: "text/markdown;charset=utf-8" });
              const link = scope.document.createElement("a");
              link.href = URL.createObjectURL(file);
              link.download = item.name.endsWith(".md") ? item.name : `${item.name}.md`;
              link.click();
              scope.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            } catch (error) { context.showToast(error.message, "error"); }
          });
          const remove = scope.document.createElement("button");
          remove.textContent = "Remove";
          remove.addEventListener("click", async () => {
            try { await workspaceRequest(`library/${item.id}`, { method: "DELETE" }); await render(); }
            catch (error) { context.showToast(error.message, "error"); }
          });
          actions.append(open, remove);
          card.append(media, name, actions);
          grid.appendChild(card);
        });
        content.appendChild(grid);
      } catch (error) { content.textContent = error.message; }
    };
    await render();
  }
  const legacyProjectsBtn = scope.document.getElementById("projectsBtn");
  if (legacyProjectsBtn) scope.listen(legacyProjectsBtn, "click", openProjectsPanel);
  const legacyProjectToggle = scope.document.getElementById("projectToggleBtn");
  if (legacyProjectToggle) scope.listen(legacyProjectToggle, "click", (event) => {
    const button = event.currentTarget;
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    scope.document.getElementById("projectSidebarList").hidden = !expanded;
  });
  const legacyLibraryBtn = scope.document.getElementById("libraryBtn");
  if (legacyLibraryBtn) scope.listen(legacyLibraryBtn, "click", openLibraryPanel);
  scope.listen(scope.document.getElementById("activeProjectBtn"), "click", () => {
    if (context.workspaceManaged && activeProjectId) scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-project", { detail: { id: activeProjectId } }));
    else openProjectsPanel();
  });
  const composerTextWrapper = userInput?.closest(".textarea-wrapper");
  const composerScrollTrack = composerTextWrapper?.querySelector(".composer-scrollbar");
  const composerScrollThumb = composerTextWrapper?.querySelector(".composer-scrollbar-thumb");
  function updateComposerScrollbar() {
    if (!userInput || !composerTextWrapper || !composerScrollThumb) return;
    const viewport = userInput.clientHeight;
    const content = userInput.scrollHeight;
    const overflowing = content > viewport + 1;
    composerTextWrapper.classList.toggle("is-scrollable", overflowing);
    if (!overflowing) return;
    const trackHeight = composerScrollTrack.clientHeight;
    const thumbHeight = Math.max(24, Math.min(trackHeight, trackHeight * viewport / content));
    const travel = Math.max(0, trackHeight - thumbHeight);
    const scrollRange = Math.max(1, content - viewport);
    composerScrollThumb.style.height = `${thumbHeight}px`;
    composerScrollThumb.style.transform = `translateY(${travel * userInput.scrollTop / scrollRange}px)`;
  }
  let scrollbarDragOffset = null;
  function scrollComposerToPointer(event) {
    const track = composerScrollTrack.getBoundingClientRect();
    const thumbHeight = composerScrollThumb.getBoundingClientRect().height;
    const travel = Math.max(0, track.height - thumbHeight);
    if (!travel) return;
    const thumbTop = Math.max(0, Math.min(travel, event.clientY - track.top - scrollbarDragOffset));
    userInput.scrollTop = thumbTop / travel * (userInput.scrollHeight - userInput.clientHeight);
    updateComposerScrollbar();
  }
  if (composerScrollTrack && composerScrollThumb) {
    scope.listen(composerScrollTrack, "pointerdown", (event) => {
      if (!composerTextWrapper.classList.contains("is-scrollable")) return;
      event.preventDefault();
      const thumb = composerScrollThumb.getBoundingClientRect();
      scrollbarDragOffset = event.target === composerScrollThumb
        ? event.clientY - thumb.top
        : thumb.height / 2;
      composerScrollTrack.setPointerCapture(event.pointerId);
      scrollComposerToPointer(event);
    });
    scope.listen(composerScrollTrack, "pointermove", (event) => {
      if (scrollbarDragOffset !== null) scrollComposerToPointer(event);
    });
    const stopScrollbarDrag = () => { scrollbarDragOffset = null; };
    scope.listen(composerScrollTrack, "pointerup", stopScrollbarDrag);
    scope.listen(composerScrollTrack, "pointercancel", stopScrollbarDrag);
    scope.listen(composerScrollTrack, "lostpointercapture", stopScrollbarDrag);
  }
  function adjustHeight() {
    // Expanded (the composer's Expand button) takes the free height the composer measured.
    const expanded = DOM.chatForm?.classList.contains("is-expanded");
    const fitted = parseFloat(DOM.chatForm?.style.getPropertyValue("--gx-expanded-h") || "");
    const max = expanded ? Math.max(144, fitted || Math.round(scope.window.innerHeight * 0.5)) : 144;
    const previous = userInput.style.height;
    userInput.style.height = "auto";
    const next = (expanded ? max : Math.min(userInput.scrollHeight, max)) + "px";
    // Start from the old height so the CSS height transition animates growth.
    userInput.style.height = previous;
    void userInput.offsetHeight;
    userInput.style.height = next;
    updateComposerScrollbar();
    updateComposerState();
  }
  function updateComposerState() {
    const hasContent = Boolean(userInput?.value.trim()) ||
      Boolean(scope.window.attachedFiles?.length);
    DOM.chatForm?.classList.toggle("has-content", hasContent);
    sendBtn?.setAttribute("aria-hidden", String(!hasContent));
  }
  function useSuggestion(text) {
    if (userInput) {
      userInput.value = text;
      userInput.focus();
      adjustHeight();
    }
  }
  async function regenerateBotMessage(botBubble) {
    const previousUser = getPreviousUserMessage(botBubble);
    if (!previousUser || !context.token || sendBtn.disabled) return;
    const text = previousUser._messageText || "";
    const files = previousUser._messageFiles || [];
    const selectedModel = modelSelect
      ? modelSelect.value
      : "google/gemini-2.5-flash";
    const contentDiv = botBubble.querySelector(".message-content");
    if (!contentDiv) return;
    sendBtn.disabled = true;
    userInput.disabled = true;
    botBubble.classList.add("streaming", "latest-bot-message");
    botBubble._activity = [];
    botBubble._sources = [];
    contentDiv.innerHTML = scope.sanitizeHtml(
      '<div class="chat-loader" aria-label="AI is thinking"></div>',
    );
    let fullContent = "";
    const streamingRenderer = createStreamingMarkdownRenderer(
      contentDiv,
      scrollToBottom,
    );
    const controller = new AbortController();
    activeSendController = controller;
    DOM.chatForm?.classList.add("is-generating");
    try {
      const base64Files = [];
      for (const file of files) {
        base64Files.push(await buildAttachmentPayload(file));
      }
      const payload = {
        message: text,
        model: selectedModel,
        files: base64Files,
      };
      if (currentChatId) payload.conversationId = currentChatId;
      const response = await scope.fetch(
        `${context.API_BASE_URL}/chat/stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${context.token}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 409 && errData.conversationId) {
          await selectChat(errData.conversationId);
          scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"));
        }
        throw new Error(errData.message || `Server error: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk =
          leftover +
          decoder.decode(value, {
            stream: true,
          });
        const lines = chunk.split("\n");
        leftover = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;
          const data = JSON.parse(jsonStr);
          if (data.error) throw new Error(data.error);
          recordResponseActivity(botBubble, data);
          if (data.token) {
            fullContent += data.token;
            scope.document.dispatchEvent(new CustomEvent("genyxo:answer-token", { detail: { token: data.token } }));
            botBubble._botText = fullContent;
            streamingRenderer.update(fullContent);
          }
          if (data.status === "done" && data.creditBalance !== undefined) {
            context.updateBalanceUI(data.creditBalance);
          }
        }
      }
      if (fullContent.trim()) streamingRenderer.flush(fullContent);
    } catch (err) {
      if (err.name !== "AbortError") {
        context.showToast(err.message, "error");
        contentDiv.textContent = `Error: ${err.message}`;
        contentDiv.style.color = "var(--error-red)";
      }
    } finally {
      if (fullContent.trim()) streamingRenderer.flush(fullContent);
      else if (controller.signal.aborted && botBubble.isConnected) {
        contentDiv.innerHTML = scope.sanitizeHtml('<div class="message-text bot-message-text gx-stopped">Response stopped.</div>');
      }
      botBubble.classList.remove("streaming");
      if (activeSendController === controller) activeSendController = null;
      if (!activeSendController) DOM.chatForm?.classList.remove("is-generating");
      sendBtn.disabled = false;
      userInput.disabled = false;
      userInput.focus();
    }
  }
  async function sendMessage() {
    const requestViewRevision = chatViewRevision;
    // A skill or map places mentioned with "@" in the React composer go with this message.
    const composer = { presetId: undefined, places: undefined, mode: undefined };
    scope.document.dispatchEvent(new CustomEvent("genyxo:composer-collect", { detail: composer }));
    const text = userInput.value.trim();
    const selectedModel = modelSelect
      ? modelSelect.value
      : "google/gemini-2.5-flash";
    const files = scope.window.attachedFiles
      ? [...scope.window.attachedFiles]
      : [];
    if ((!text && files.length === 0) || !context.token || sendBtn.disabled)
      return;
    if (composer.presetId !== undefined) activePresetId = composer.presetId;
    scope.document.dispatchEvent(new CustomEvent("genyxo:composer-sent"));
    stopDictation();
    sendBtn.disabled = true;
    userInput.disabled = true;
    if (!currentChatId) toggleChatView(true);
    const userBubble = appendMessage("user", text, "", files);
    userInput.value = "";
    userInput.style.height = "auto";
    updateComposerScrollbar();
    updateComposerState();
    if (typeof scope.window.clearAttachedFiles === "function") {
      scope.window.clearAttachedFiles();
    } else if (scope.window.attachedFiles) {
      scope.window.attachedFiles.length = 0;
    }
    if (typeof context.renderAllPreviews === "function") {
      context.renderAllPreviews();
    }
    const botBubble = appendMessage(
      "bot",
      '<div class="chat-loader" aria-label="AI is thinking"></div>',
    );
    botBubble._messageModel = selectedModel;
    botBubble.classList.add("streaming");
    botBubble._activity = [];
    botBubble._sources = [];
    const contentDiv = botBubble.querySelector(".message-content") || botBubble;
    let fullContent = "";
    const streamingRenderer = createStreamingMarkdownRenderer(
      contentDiv,
      scrollToBottom,
    );
    const controller = new AbortController();
    activeSendController = controller;
    DOM.chatForm?.classList.add("is-generating");
    let responseConversationId = currentChatId;
    let completed = false;
    let receivedResponse = false;
    try {
      const base64Files = [];
      for (const file of files) {
        base64Files.push(await buildAttachmentPayload(file));
      }
      const url = `${context.API_BASE_URL}/chat/stream`;
      const payload = {
        message: text,
        model: selectedModel,
        files: base64Files,
      };
      if (activePresetId !== undefined) payload.presetId = activePresetId;
      // The Maps page shares the user's location, which gives the model map tools.
      const sharedLocation = scope.window.genyxoMaps?.location?.();
      if (sharedLocation) payload.location = sharedLocation;
      if (composer.places?.length) payload.pinnedPlaces = composer.places;
      // "+" menu modes: Web search or Deep research for this message.
      if (composer.mode) payload.mode = composer.mode;
      // Voice mode marks its turns on the form so replies come back short and in the spoken language.
      const voiceTurn = DOM.chatForm?.dataset.voiceTurn === "1";
      const voiceLanguage = DOM.chatForm?.dataset.voiceLanguage || "";
      if (DOM.chatForm) delete DOM.chatForm.dataset.voiceTurn;
      if (voiceTurn) payload.voice = true;
      if (voiceTurn && voiceLanguage) payload.language = voiceLanguage;
      const locales = [...(scope.window.navigator.languages || [])].filter((tag) => /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag)).slice(0, 4);
      if (locales.length) payload.locales = locales;
      if (currentChatId) {
        payload.conversationId = currentChatId;
      } else if (activeProjectId) {
        payload.projectId = activeProjectId;
      }
      if (context.workspaceManaged && !currentChatId) {
        const fingerprint = JSON.stringify(payload);
        if (pendingFirstSend?.fingerprint !== fingerprint) pendingFirstSend = { fingerprint, id: crypto.randomUUID() };
        payload.clientRequestId = pendingFirstSend.id;
      }
      const response = await scope.fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${context.token}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      });
      receivedResponse = true;
      if (!response.ok) {
        if (response.status === 401) {
          scope.window.location.href = "/";
          return;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { value, done } = await reader.read();
        if (requestViewRevision !== chatViewRevision) { await reader.cancel(); break; }
        if (done) break;
        const chunk =
          leftover +
          decoder.decode(value, {
            stream: true,
          });
        const lines = chunk.split("\n");
        leftover = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr.startsWith("402")) {
              throw new Error(
                "❌ Insufficient funds. Please top up your balance.",
              );
            }
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonStr);
              if (data.conversationId) responseConversationId = data.conversationId;
              if (data.error) {
                const failure = new Error(data.error);
                // The server undoes an unanswered turn; null means it removed the new chat.
                failure.rolledBack = Boolean(data.rolledBack);
                failure.conversationId = data.conversationId;
                throw failure;
              }
              recordResponseActivity(botBubble, data);
              if (data.messageId) botBubble.dataset.messageId = String(data.messageId);
              if (data.token) {
                if (fullContent === "")
                  contentDiv.innerHTML = scope.sanitizeHtml("");
                fullContent += data.token;
                scope.document.dispatchEvent(new CustomEvent("genyxo:answer-token", { detail: { token: data.token } }));
                botBubble._botText = fullContent;
                streamingRenderer.update(fullContent);
              }
              if (
                data.status === "conversation" &&
                data.conversationId &&
                !currentChatId
              ) {
                currentChatId = data.conversationId;
                updateUrl(data.conversationId);
                addConversationToHistory({
                  id: currentChatId,
                  title:
                    data.conversationTitle ||
                    (context.workspaceManaged ? "New chat" : text
                      ? text.slice(0, 30) + (text.length > 30 ? "..." : "")
                      : "New Chat"),
                  model: selectedModel,
                });
                continue;
              }
              if (data.conversationId && !currentChatId) {
                currentChatId = data.conversationId;
                updateUrl(data.conversationId);
                addConversationToHistory({
                  id: currentChatId,
                  title: context.workspaceManaged ? "New chat" : text
                    ? text.slice(0, 30) + (text.length > 30 ? "..." : "")
                    : "New Chat",
                  model: selectedModel,
                });
              }
              if (
                data.messageId &&
                (selectedModel.includes("kling") ||
                  selectedModel.includes("luma"))
              ) {
                if (fullContent.trim()) streamingRenderer.flush(fullContent);
                botBubble.classList.remove("streaming");
                startVideoPolling(data.messageId, contentDiv);
                reader.cancel();
                break;
              }
              if (data.status === "done" && data.creditBalance !== undefined) {
                context.updateBalanceUI(data.creditBalance);
              }
              if (data.status === "done") completed = true;
            } catch (e) {
              if (
                e.message !== "Unexpected end of JSON input" &&
                !e.message.includes("JSON")
              ) {
                throw e;
              }
            }
          }
        }
        scrollToBottom();
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      if (err.rolledBack && err.conversationId === null && currentChatId && String(currentChatId) === String(responseConversationId)) {
        currentChatId = null;
        responseConversationId = null;
        updateUrl(null);
        publishWorkspaceState();
      }
      if (requestViewRevision === chatViewRevision && !fullContent) {
        // A network failure can happen after server acceptance. Reuse its key.
        if (receivedResponse) pendingFirstSend = null;
        // Keep the question in place and offer Retry, like a failed send in any chat app.
        const restoreDraft = () => {
          userBubble.remove();
          botBubble.remove();
          userInput.value = text;
          scope.window.attachedFiles = files;
          context.renderAllPreviews?.();
          userInput.dispatchEvent(new Event("input", { bubbles: true }));
        };
        showTurnError(botBubble, err.message, () => { restoreDraft(); sendMessage(); }, () => { restoreDraft(); userInput.focus(); });
      } else {
        context.showToast(err.message, "error");
        contentDiv.textContent = `❌ Error: ${err.message}`;
        contentDiv.style.color = "var(--error-red)";
      }
    } finally {
      if (fullContent.trim()) streamingRenderer.flush(fullContent);
      else if (controller.signal.aborted && botBubble.isConnected) {
        contentDiv.innerHTML = scope.sanitizeHtml('<div class="message-text bot-message-text gx-stopped">Response stopped.</div>');
      }
      botBubble.classList.remove("streaming");
      if (activeSendController === controller || !activeSendController) DOM.chatForm?.classList.remove("is-generating");
      if (requestViewRevision === chatViewRevision) {
        sendBtn.disabled = false;
        userInput.disabled = false;
        if (isChatPath(scope.window.location.pathname)) userInput.focus();
      }
      updateComposerState();
      if (activeSendController === controller) activeSendController = null;
      if (completed) { pendingFirstSend = null; activePresetId = undefined; attachCanvasCard(botBubble, fullContent, true); }
      scope.document.dispatchEvent(new CustomEvent("genyxo:answer-done", { detail: { ok: completed, text: fullContent } }));
      if (context.workspaceManaged) {
        scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"));
        if (completed && responseConversationId) {
          scope.fetch(`${context.API_BASE_URL}/chat/workspace/conversations/${responseConversationId}/title-generation`, { method: "POST", headers: { Authorization: `Bearer ${context.token}`, "Content-Type": "application/json" }, body: "{}" }).then(() => scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"))).catch(() => {});
        }
      }
    }
  }
  async function startVideoPolling(messageId, element) {
    let attempts = 0;
    const maxAttempts = 60;
    element.innerHTML = scope.sanitizeHtml(`
        <div class="video-loading-status">
            <i class="fas fa-spinner fa-spin"></i>
            <span class="status-text">Magic is happening... Generating your video</span>
        </div>
    `);
    const interval = scope.setInterval(async () => {
      if (!element.isConnected) {
        clearInterval(interval);
        return;
      }
      attempts++;
      try {
        const res = await scope.fetch(
          `${context.API_BASE_URL}/chat/message-status/${messageId}`,
          {
            headers: {
              Authorization: `Bearer ${context.token}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();
        if (data.isReady && data.videoUrl) {
          clearInterval(interval);
          element.innerHTML = scope.sanitizeHtml(`
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
                `);
          scrollToBottom();
          return;
        }
        if (
          data.status === "error" ||
          (data.content && data.content.includes("❌"))
        ) {
          clearInterval(interval);
          element.innerHTML = scope.sanitizeHtml(
            `<div class="error-box">❌ Generation failed: ${data.content || "Unknown error"}</div>`,
          );
          return;
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          element.innerHTML = scope.sanitizeHtml(
            `<div class="error-box">⚠️ Generation is taking longer than expected. Please check your history in a few minutes.</div>`,
          );
        }
      } catch (e) {
        console.error("Polling error:", e);
        clearInterval(interval);
      }
    }, 5000);
  }
  function appendError(msg) {
    const msgDiv = scope.document.createElement("div");
    msgDiv.className = "message bot-message error-message";
    const content = scope.document.createElement("div");
    content.className = "message-content";
    const icon = scope.document.createElement("i");
    icon.className = "fas fa-exclamation-circle";
    content.appendChild(icon);
    content.appendChild(
      scope.document.createTextNode(" " + String(msg || "An error occurred")),
    );
    msgDiv.appendChild(content);
    chatBox.appendChild(msgDiv);
    scrollToBottom();
  }
  async function initChat() {
    try {
      if (!context.token) {
        if (typeof context.updateUIState === "function")
          context.updateUIState(false);
        context.updateBalanceUI(0);
        toggleChatView(false);
        return;
      }
      const profileRes = await scope.fetch(`${context.API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      });
      if (profileRes.ok) {
        const user = await profileRes.json();
        context.updateBalanceUI(user.credits || 0);
        if (navAvatarImg)
          navAvatarImg.src =
            user.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
        const dropdownAv = scope.document.getElementById("dropdownAvatars");
        if (dropdownAv)
          dropdownAv.src =
            user.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
        if (context.menuName)
          context.menuName.textContent = user.name || "User";
        if (context.menuEmail) context.menuEmail.textContent = user.email || "";
        if (context.menuCredits)
          context.menuCredits.textContent = user.credits || 0;
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        localStorage.removeItem("authToken");
        context.token = null;
        scope.window.token = null;
        if (typeof context.updateUIState === "function")
          context.updateUIState(false);
        context.updateBalanceUI(0);
        toggleChatView(false);
        return;
      }
      const urlParams = new URLSearchParams(scope.window.location.search);
      let chatIdFromUrl = urlParams.get("id");
      await loadConversations();
      if (scope.window.location.pathname.startsWith("/c/")) {
        // Someone else's (or a made-up) key resolves to nothing: never load it.
        const key = chatKeyFromPath(scope.window.location.pathname);
        const found = key ? await resolveChatKey(key) : null;
        chatIdFromUrl = found ? String(found.id) : null;
        if (!found)
          scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message: "Chat not found", type: "error" } }));
      }
      if (chatIdFromUrl && chatIdFromUrl !== "null") {
        await selectChat(chatIdFromUrl);
      } else if (
        !context.workspaceManaged && Array.isArray(conversations) &&
        conversations.length > 0 &&
        conversations[0].id
      ) {
        await selectChat(conversations[0].id);
      } else {
        startNewChat();
      }
    } catch (e) {
      console.error("Critical initialization error:", e);
      toggleChatView(false);
    }
  }
  const newChatBtn = scope.document.querySelector(".new-chat-btn");
  if (newChatBtn) {
    newChatBtn.onclick = (e) => {
      e.preventDefault();
      startNewChat();
    };
  }
  const stopBtn = scope.document.getElementById("stopBtn");
  if (stopBtn) scope.listen(stopBtn, "click", stopGeneration);
  scope.listen(scope.document, "keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || scope.document.querySelector("dialog[open]")) return;
    if (stopGeneration()) event.preventDefault();
  });
  const scrollBottomBtn = scope.document.getElementById("scrollBottomBtn");
  if (scrollBottomBtn && DOM.chatBox) {
    const updateScrollButton = () => {
      const box = DOM.chatBox;
      const away = box.scrollHeight - box.scrollTop - box.clientHeight > 240;
      scrollBottomBtn.classList.toggle("is-visible", away);
      scrollBottomBtn.tabIndex = away ? 0 : -1;
    };
    scope.listen(DOM.chatBox, "scroll", updateScrollButton, { passive: true });
    scope.listen(scrollBottomBtn, "click", () => DOM.chatBox.scrollTo({ top: DOM.chatBox.scrollHeight, behavior: "smooth" }));
  }
  if (DOM.chatForm) {
    scope.listen(DOM.chatForm, "submit", (event) => {
      event.preventDefault();
      sendMessage();
    });
  } else if (sendBtn) {
    scope.listen(sendBtn, "click", sendMessage);
  }
  if (toggleBtn && sidebar) {
    scope.listen(toggleBtn, "click", () => {
      const opened = sidebar.classList.toggle("active");
      if (sidebarOverlay) sidebarOverlay.classList.toggle("show", opened);
    });
  }
  if (sidebarOverlay && sidebar) {
    scope.listen(sidebarOverlay, "click", () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("show");
    });
  }
  if (userInput) {
    scope.listen(userInput, "input", adjustHeight);
    scope.listen(userInput, "scroll", updateComposerScrollbar);
    scope.listen(userInput, "keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  scope.listen(scope.window, "genyxo:attachments-changed", updateComposerState);
  updateComposerState();
  updateComposerScrollbar();
  const voiceBtn = scope.document.getElementById("voiceBtn");
  const dictationStatus = scope.document.getElementById("dictationStatus");
  const SpeechRecognition = scope.window.SpeechRecognition || scope.window.webkitSpeechRecognition;
  // Signed-in dictation records the microphone and lets Gemini transcribe it,
  // so any language works; the browser recognizer stays as the guest fallback.
  const serverDictation = Boolean(voiceBtn && context.workspaceManaged && scope.window.MediaRecorder && scope.window.navigator.mediaDevices?.getUserMedia);
  if (voiceBtn && serverDictation) {
    let recorder = null;
    let micStream = null;
    let micContext = null;
    let chunks = [];
    let limitTimer = null;
    let busy = false;
    const setState = (state) => {
      voiceBtn.classList.toggle("is-listening", state === "listening");
      voiceBtn.classList.toggle("is-transcribing", state === "transcribing");
      voiceBtn.setAttribute("aria-label", state === "listening" ? "Stop dictation" : state === "transcribing" ? "Transcribing" : "Dictate a message");
      voiceBtn.title = voiceBtn.getAttribute("aria-label");
      dictationStatus.textContent = state === "listening" ? "Listening" : state === "transcribing" ? "Transcribing" : "";
    };
    const release = () => {
      if (limitTimer) scope.window.clearTimeout(limitTimer);
      limitTimer = null;
      micStream?.getTracks().forEach((track) => track.stop());
      micStream = null;
      micContext?.close().catch(() => {});
      micContext = null;
    };
    const transcribe = async (blob) => {
      busy = true;
      setState("transcribing");
      try {
        const audio = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        const response = await scope.fetch(`${context.API_BASE_URL}/chat/voice/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${context.token}` },
          body: JSON.stringify({ audio, mimeType: blob.type || "audio/webm", locales: [...(scope.window.navigator.languages || [])].filter((tag) => /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag)).slice(0, 4) }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Dictation failed");
        if (data.text && !userInput.disabled) {
          userInput.value = [userInput.value.trim(), data.text].filter(Boolean).join(" ");
          userInput.dispatchEvent(new Event("input", { bubbles: true }));
          userInput.focus();
        } else if (!data.text) {
          context.showToast?.("No speech was recognized. Try again a little closer to the microphone.", "info");
        }
      } catch (error) {
        context.showToast?.(error.message || "Dictation failed", "error");
      } finally {
        busy = false;
        setState("idle");
      }
    };
    const stop = () => {
      if (!recorder || recorder.state === "inactive") return;
      recorder.stop();
    };
    stopDictation = stop;
    scope.listen(voiceBtn, "click", async () => {
      if (busy) return;
      if (recorder && recorder.state !== "inactive") { stop(); return; }
      if (!context.token) { context.showToast?.("Sign in to use dictation.", "info"); return; }
      try {
        micStream = await scope.window.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        dictationStatus.textContent = "Microphone permission was denied";
        context.showToast?.("Allow microphone access to dictate.", "error");
        return;
      }
      // A little extra input gain makes quiet laptop microphones easier to transcribe.
      micContext = new scope.window.AudioContext();
      if (micContext.state === "suspended") await micContext.resume().catch(() => {});
      const gain = micContext.createGain();
      gain.gain.value = 1.8;
      const destination = micContext.createMediaStreamDestination();
      micContext.createMediaStreamSource(micStream).connect(gain);
      gain.connect(destination);
      const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((candidate) => scope.window.MediaRecorder.isTypeSupported(candidate));
      recorder = new scope.window.MediaRecorder(destination.stream, type ? { mimeType: type } : undefined);
      chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
        recorder = null;
        release();
        if (blob.size > 600) void transcribe(blob);
        else setState("idle");
      };
      recorder.start(250);
      setState("listening");
      limitTimer = scope.setTimeout(stop, 120000);
    });
    scope.cleanup(() => { if (recorder && recorder.state !== "inactive") { recorder.onstop = null; recorder.stop(); } release(); });
  } else if (voiceBtn) {
    if (!SpeechRecognition) {
      voiceBtn.title = "Voice dictation is unavailable in this browser";
      scope.listen(voiceBtn, "click", () => context.showToast("Voice dictation is unavailable in this browser", "info"));
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = scope.window.navigator.language || scope.document.documentElement.lang || "en-US";
      let listening = false;
      let startingText = "";
      stopDictation = () => { if (listening) recognition.stop(); };
      recognition.onresult = (event) => {
        if (userInput.disabled) return;
        const spoken = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ").trim();
        userInput.value = [startingText, spoken].filter(Boolean).join(" ");
        userInput.dispatchEvent(new Event("input", { bubbles: true }));
      };
      recognition.onend = () => {
        listening = false;
        voiceBtn.classList.remove("is-listening");
        voiceBtn.setAttribute("aria-label", "Dictate a message");
        dictationStatus.textContent = "Dictation stopped";
      };
      recognition.onerror = (event) => {
        dictationStatus.textContent = event.error === "not-allowed"
          ? "Microphone permission was denied"
          : "Dictation could not start";
      };
      scope.listen(voiceBtn, "click", () => {
        if (listening) {
          recognition.stop();
          return;
        }
        startingText = userInput.value.trim();
        recognition.lang = scope.window.navigator.language || scope.document.documentElement.lang || "en-US";
        try {
          recognition.start();
          listening = true;
          voiceBtn.classList.add("is-listening");
          voiceBtn.setAttribute("aria-label", "Stop dictation");
          dictationStatus.textContent = "Listening";
        } catch {
          dictationStatus.textContent = "Dictation could not start";
        }
      });
      scope.cleanup(() => recognition.abort());
    }
  }
  scope.window.useSuggestion = function (cardElement) {
    const text = cardElement.querySelector(".suggestion-text").innerText;
    userInput.value = text;
    sendMessage();
  };
  scope.window.toggleDropdown = function (e, id) {
    e.stopPropagation();
    scope.document
      .querySelectorAll(".options-dropdown")
      .forEach((d) => d.classList.remove("show"));
    const dropdown = scope.document.getElementById(`dropdown-${id}`);
    if (dropdown) dropdown.classList.toggle("show");
  };
  scope.window.addEventListener("click", () => {
    scope.document
      .querySelectorAll(".options-dropdown")
      .forEach((d) => d.classList.remove("show"));
    closeBotMoreMenus();
  });
  (function () {
    const docEl = scope.document.documentElement;
    function updateViewportVars() {
      const vv = scope.window.visualViewport;
      const height = vv ? vv.height : scope.window.innerHeight;
      docEl.style.setProperty("--app-height", `${height}px`);
      if (vv) {
        const bottom = Math.max(
          0,
          scope.window.innerHeight - vv.height - vv.offsetTop,
        );
        docEl.style.setProperty("--vv-bottom", `${bottom}px`);
      } else {
        docEl.style.setProperty("--vv-bottom", "0px");
      }
    }
    updateViewportVars();
    if (scope.window.visualViewport) {
      scope.listen(scope.window.visualViewport, "resize", updateViewportVars);
      scope.listen(scope.window.visualViewport, "scroll", updateViewportVars);
    }
    scope.window.addEventListener("resize", updateViewportVars);
  })();
  (function () {
    const native = scope.document.getElementById("modelSelect");
    const custom = scope.document.getElementById("customModelSelect");
    if (!native || !custom) return;
    const optionsList = custom.querySelector(".custom-options");
    const current = custom.querySelector(".current-model-name");
    const menu = custom.querySelector(".model-picker-menu");
    const search = custom.querySelector(".model-picker-search");
    const modeTabs = Array.from(custom.querySelectorAll("[data-mode]"));
    const favoriteKey = "genyxo:model-favorites";
    let favorites = [];
    try { favorites = JSON.parse(scope.window.localStorage.getItem(favoriteKey) || "[]"); } catch { favorites = []; }
    if (!Array.isArray(favorites)) favorites = [];
    const modeFor = (value) => {
      if (value === "openai/dall-e-3") return "image";
      if (value === "kling-video") return "video";
      if (/embedding|robotics|audio|live-translate/.test(value)) return "unsupported";
      return "chat";
    };
    let activeMode = modeFor(native.value);
    const providerFor = (value) => {
      if (value.startsWith("openai/") && value !== "openai/dall-e-3") return "ChatGPT";
      if (value.startsWith("google/") && !value.includes("gemma")) return "Gemini";
      if (value.startsWith("anthropic/")) return "Claude";
      if (value.startsWith("nvidia/")) return "NVIDIA Nemotron";
      if (value.includes("gemma")) return "Gemma";
      if (value === "openai/dall-e-3") return "DALL·E";
      if (value === "kling-video") return "Kling";
      return "Other models";
    };
    let expandedProvider = providerFor(native.value);
    function renderModelLabel(container, option) {
      container.replaceChildren();
      const icon = scope.document.createElement("img");
      icon.className = "model-option-icon";
      icon.src = getModelIconSrc(option.value);
      icon.alt = getModelProviderName(option.value);
      const label = scope.document.createElement("span");
      label.className = "model-option-label";
      label.textContent = option.textContent;
      container.append(icon, label);
    }
    function renderOptions() {
      optionsList.replaceChildren();
      const query = search.value.trim().toLowerCase();
      const matching = Array.from(native.options).filter((opt) =>
        modeFor(opt.value) === activeMode &&
        opt.textContent.toLowerCase().includes(query),
      );
      const groups = new Map();
      matching.forEach((opt) => {
        const provider = providerFor(opt.value);
        if (!groups.has(provider)) groups.set(provider, []);
        groups.get(provider).push(opt);
      });
      const providerOrder = ["ChatGPT", "Gemini", "Claude", "NVIDIA Nemotron", "Gemma", "DALL·E", "Kling"];
      Array.from(groups.entries()).sort((a, b) => providerOrder.indexOf(a[0]) - providerOrder.indexOf(b[0])).forEach(([provider, models]) => {
        const group = scope.document.createElement("li");
        group.className = "model-provider";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", `${provider} models`);
        const heading = scope.document.createElement("button");
        heading.type = "button";
        heading.className = "model-provider-heading";
        heading.dataset.provider = provider;
        heading.setAttribute("aria-expanded", String(Boolean(query) || expandedProvider === provider));
        const icon = scope.document.createElement("img");
        icon.src = getModelIconSrc(models[0].value);
        icon.alt = "";
        const title = scope.document.createElement("span");
        title.textContent = provider;
        const count = scope.document.createElement("small");
        count.textContent = String(models.length);
        const chevron = scope.document.createElement("i");
        chevron.className = "fas fa-chevron-down";
        chevron.setAttribute("aria-hidden", "true");
        heading.append(icon, title, count, chevron);
        const children = scope.document.createElement("ul");
        children.className = "model-provider-options";
        children.hidden = !query && expandedProvider !== provider;
        models.sort((a, b) => Number(favorites.includes(b.value)) - Number(favorites.includes(a.value))).forEach((opt) => {
        const li = scope.document.createElement("li");
        li.dataset.value = opt.value;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(opt.selected));
        li.tabIndex = 0;
        renderModelLabel(li, opt);
        const favorite = scope.document.createElement("button");
        favorite.type = "button";
        favorite.className = "model-favorite";
        favorite.dataset.favorite = opt.value;
        favorite.setAttribute("aria-label", favorites.includes(opt.value) ? `Remove ${opt.textContent} from favorites` : `Add ${opt.textContent} to favorites`);
        favorite.setAttribute("aria-pressed", String(favorites.includes(opt.value)));
        favorite.textContent = favorites.includes(opt.value) ? "★" : "☆";
        li.appendChild(favorite);
        if (opt.selected) li.classList.add("active");
        children.appendChild(li);
        });
        group.append(heading, children);
        optionsList.appendChild(group);
      });
      if (!matching.length) {
        const empty = scope.document.createElement("li");
        empty.className = "model-picker-empty";
        empty.textContent = "No compatible models found";
        optionsList.appendChild(empty);
      }
      modeTabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === activeMode)));
      custom.querySelector(".model-picker-tabs").dataset.activeMode = activeMode;
    }
    renderOptions();
    const selected = native.options[native.selectedIndex];
    if (selected && current) renderModelLabel(current, selected);
    scope.listen(native, "change", () => {
      const option = native.options[native.selectedIndex];
      if (!option) return;
      activeMode = modeFor(option.value);
      expandedProvider = providerFor(option.value);
      renderModelLabel(current, option);
      // Rebuild only once the menu has closed, so the open list never jumps.
      if (menu.classList.contains("is-closing")) scope.setTimeout(renderOptions, 180);
      else renderOptions();
    });
    let closeTimer = null;
    function closeOptions() {
      if (!menu.classList.contains("show") || menu.classList.contains("is-closing")) return;
      custom.setAttribute("aria-expanded", "false");
      // Let the exit animation play before the menu leaves the layout.
      menu.classList.add("is-closing");
      closeTimer = scope.setTimeout(() => {
        menu.classList.remove("show", "is-closing");
        closeTimer = null;
      }, scope.window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 170);
    }
    function openOptions() {
      if (closeTimer) { scope.window.clearTimeout(closeTimer); closeTimer = null; }
      menu.classList.remove("is-closing");
      menu.classList.add("show");
      custom.setAttribute("aria-expanded", "true");
    }
    // Expands one provider in place with a height animation instead of re-rendering the list.
    function toggleProvider(provider) {
      const reduced = scope.window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const animate = (list, open) => {
        const heading = list.previousElementSibling;
        heading.setAttribute("aria-expanded", String(open));
        list.getAnimations().forEach((animation) => animation.cancel());
        if (reduced) { list.hidden = !open; return; }
        if (open) {
          list.hidden = false;
          const height = list.scrollHeight;
          list.classList.add("is-entering");
          list.animate([{ height: "0px", opacity: 0 }, { height: `${height}px`, opacity: 1 }], { duration: 300, easing: "cubic-bezier(.22, 1, .36, 1)" })
            .finished.then(() => list.classList.remove("is-entering"), () => {});
        } else {
          const height = list.scrollHeight;
          list.animate([{ height: `${height}px`, opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "cubic-bezier(.4, 0, .2, 1)" })
            .finished.then(() => { if (heading.getAttribute("aria-expanded") === "false") list.hidden = true; }, () => {});
        }
      };
      expandedProvider = expandedProvider === provider ? "" : provider;
      optionsList.querySelectorAll(".model-provider").forEach((group) => {
        const heading = group.querySelector("[data-provider]");
        const list = group.querySelector(".model-provider-options");
        const shouldOpen = heading.dataset.provider === expandedProvider;
        if ((heading.getAttribute("aria-expanded") === "true") !== shouldOpen) animate(list, shouldOpen);
      });
      const heading = Array.from(optionsList.querySelectorAll("[data-provider]")).find((item) => item.dataset.provider === expandedProvider);
      if (heading) {
        scope.setTimeout(() => optionsList.scrollTo({ top: optionsList.scrollTop + heading.getBoundingClientRect().top - optionsList.getBoundingClientRect().top - 4, behavior: reduced ? "auto" : "smooth" }), 60);
      }
    }
    scope.listen(custom, "click", (e) => {
      if (menu.contains(e.target)) return;
      e.stopPropagation();
      // A menu that is animating closed counts as closed, so a quick click reopens it.
      const isOpen = menu.classList.contains("show") && !menu.classList.contains("is-closing");
      if (isOpen) closeOptions();
      else openOptions();
    });
    modeTabs.forEach((tab) => scope.listen(tab, "click", (e) => {
      e.stopPropagation();
      activeMode = tab.dataset.mode;
      search.value = "";
      const first = Array.from(native.options).find((opt) => modeFor(opt.value) === activeMode);
      if (first) {
        native.value = first.value;
        renderModelLabel(current, first);
        native.dispatchEvent(new Event("change"));
      }
      renderOptions();
      openOptions();
    }));
    scope.listen(search, "click", (e) => e.stopPropagation());
    scope.listen(search, "input", renderOptions);
    scope.listen(optionsList, "click", (e) => {
      const providerButton = e.target.closest("[data-provider]");
      if (providerButton) {
        e.stopPropagation();
        if (search.value.trim()) return;
        toggleProvider(providerButton.dataset.provider);
        return;
      }
      const favoriteButton = e.target.closest("[data-favorite]");
      if (favoriteButton) {
        e.stopPropagation();
        const value = favoriteButton.dataset.favorite;
        favorites = favorites.includes(value) ? favorites.filter((item) => item !== value) : [...favorites, value];
        try { scope.window.localStorage.setItem(favoriteKey, JSON.stringify(favorites)); } catch { /* Private browsing can disable storage. */ }
        renderOptions();
        return;
      }
      const li = e.target.closest("li");
      if (!li?.dataset.value) return;
      // The list re-renders after this click; without this the trigger would read it as a new open.
      e.stopPropagation();
      native.value = li.dataset.value;
      const selectedOption = Array.from(native.options).find(
        (opt) => opt.value === li.dataset.value,
      );
      if (current && selectedOption) renderModelLabel(current, selectedOption);
      optionsList
        .querySelectorAll("li")
        .forEach((n) => n.classList.remove("active"));
      li.classList.add("active");
      closeOptions();
      native.dispatchEvent(new Event("change"));
    });
    scope.listen(optionsList, "keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest("li[data-value]")) {
        e.preventDefault();
        e.target.click();
      }
    });
    scope.document.addEventListener("click", (e) => {
      if (!custom.contains(e.target) && !optionsList.contains(e.target))
        closeOptions();
    });
    scope.listen(custom, "keydown", (e) => {
      if (menu.contains(e.target)) return;
      const items = Array.from(optionsList.querySelectorAll("li[data-value]"));
      const idx = items.findIndex((it) => it.classList.contains("active"));
      if (e.key === "ArrowDown") {
        const next = items[Math.min(items.length - 1, Math.max(0, idx + 1))];
        if (next) next.click();
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        const prev = items[Math.max(0, idx - 1)];
        if (prev) prev.click();
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        const isOpen = menu.classList.contains("show");
        if (!isOpen) openOptions();
        else closeOptions();
        e.preventDefault();
      } else if (e.key === "Escape") {
        closeOptions();
      }
    });
  })();
  scope.window.addEventListener("load", () => {
    const urlParams = new URLSearchParams(scope.window.location.search);
    const searchQuery = urlParams.get("q");
    if (searchQuery && userInput) {
      userInput.value = searchQuery;
      scope.setTimeout(() => {
        sendMessage();
      }, 500);
    }
  });
  scope.document.addEventListener("DOMContentLoaded", () => {
    if (scope.window.i18n && typeof scope.window.i18n.init === "function") {
      scope.window.i18n.init().then(initChat);
    } else {
      return initChat();
    }
  });
  scope.document.addEventListener("DOMContentLoaded", () => {
    const savedModel = localStorage.getItem("selectedAIModel");
    if (savedModel) {
      // Знаходиш свій select по ID
      const selectBox = scope.document.getElementById("yourChatSelectId");
      if (selectBox) {
        selectBox.value = savedModel;
        // Викликаємо change, щоб чат оновився
        selectBox.dispatchEvent(new Event("change"));
      }
      // Очищаємо пам'ять
      localStorage.removeItem("selectedAIModel");
    }
  });

  // Редактор та передперегляд зображень в інпуті
  scope.document.addEventListener("DOMContentLoaded", () => {
    const modal = scope.document.getElementById("imageEditorModal");
    const canvas = scope.document.getElementById("editorCanvas");
    const ctx = canvas.getContext("2d");
    const closeBtn = scope.document.getElementById("editorCloseBtn");
    const undoBtn = scope.document.getElementById("editorUndoBtn");
    const redoBtn = scope.document.getElementById("editorRedoBtn");
    const saveBtn = scope.document.getElementById("editorSaveBtn");
    const toolBrush = scope.document.getElementById("toolBrush");
    const toolText = scope.document.getElementById("toolText");
    const colorPicker = scope.document.getElementById("editorColorPicker");
    const colorPresets = scope.document.querySelectorAll(".color-preset");
    const brushSizeInput = scope.document.getElementById("brushSize");
    const canvasContainer = scope.document.querySelector(".canvas-container");
    let currentTool = "brush"; // 'brush' або 'text'
    let currentColor = "#ff0000";
    let brushSize = 6;
    let isDrawing = false;
    let originalImage = null;
    let targetPreviewImg = null; // Зберігає посилання на DOM-елемент мініатюри в інпуті
    let targetFileIndex = null;

    // Стек історії (Undo/Redo)
    let historyStack = [];
    let undoIndex = -1;

    // Обробка палітри кольорів
    colorPresets.forEach((preset) => {
      scope.listen(preset, "click", () => {
        colorPresets.forEach((p) => p.classList.remove("active"));
        preset.classList.add("add", "active");
        currentColor = preset.getAttribute("data-color");
        colorPicker.value = currentColor;
        colorPicker.parentElement.style.borderColor = currentColor;
      });
    });
    scope.listen(colorPicker, "input", (e) => {
      currentColor = e.target.value;
      colorPicker.parentElement.style.borderColor = currentColor;
      colorPresets.forEach((p) => p.classList.remove("active"));
    });

    // Перемикання інструментів
    scope.listen(toolBrush, "click", () => {
      currentTool = "brush";
      toolBrush.classList.add("active");
      toolText.classList.remove("active");
    });
    scope.listen(toolText, "click", () => {
      currentTool = "text";
      toolText.classList.add("active");
      toolBrush.classList.remove("active");
    });
    scope.listen(brushSizeInput, "input", (e) => {
      brushSize = parseInt(e.target.value);
    });

    // --- ГОЛОВНА ФУНКЦІЯ: ВІДКРИТТЯ РЕДАКТОРА ---
    scope.window.openImageEditor = function (imgSrc, sourceImgElement, index) {
      targetPreviewImg = sourceImgElement;
      targetFileIndex = index;
      modal.style.display = "flex";
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
    scope.listen(undoBtn, "click", () => {
      if (undoIndex > 0) {
        undoIndex--;
        ctx.putImageData(historyStack[undoIndex], 0, 0);
        updateHistoryControls();
      }
    });
    scope.listen(redoBtn, "click", () => {
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
      return {
        x,
        y,
        relativeX: clientX - rect.left,
        relativeY: clientY - rect.top,
      };
    }

    // --- МЕХАНІКА МАЛЮВАННЯ (ПЕНЗЕЛЬ) ---
    function startDrawing(e) {
      if (currentTool !== "brush") return;
      isDrawing = true;
      const coords = getCanvasCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth =
        brushSize * (canvas.width / canvas.getBoundingClientRect().width); // Адаптивна товщина лінії
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    function draw(e) {
      if (!isDrawing || currentTool !== "brush") return;
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
    scope.listen(canvas, "mousedown", startDrawing);
    scope.listen(canvas, "mousemove", draw);
    scope.window.addEventListener("mouseup", stopDrawing);
    scope.listen(canvas, "touchstart", startDrawing, {
      passive: false,
    });
    scope.listen(canvas, "touchmove", draw, {
      passive: false,
    });
    scope.window.addEventListener("touchend", stopDrawing);

    // --- МЕХАНІКА ТЕКСТУ (КЛІК ТА ВВЕДЕННЯ) ---
    scope.listen(canvas, "click", (e) => {
      if (currentTool !== "text") return;
      if (scope.document.querySelector(".canvas-text-input")) return; // Тільки один інпут одночасно

      const coords = getCanvasCoordinates(e);
      const rect = canvas.getBoundingClientRect();
      const input = scope.document.createElement("input");
      input.type = "text";
      input.className = "canvas-text-input";

      // Розрахунок відображуваного розміру шрифту в редакторі
      const scale = rect.width / canvas.width;
      const calculatedSize = Math.max(14, brushSize * 3.5 * scale);
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
          ctx.textBaseline = "top";
          ctx.fillText(val, coords.x, coords.y);
          saveState();
        }
        input.remove();
      }
      scope.listen(input, "keydown", (ev) => {
        if (ev.key === "Enter") commitText();
        if (ev.key === "Escape") input.remove();
      });
      scope.listen(input, "blur", commitText);
    });

    // ЗАКРИТТЯ БЕЗ ЗБЕРЕЖЕННЯ
    scope.listen(closeBtn, "click", () => {
      modal.style.display = "none";
      const activeInput = scope.document.querySelector(".canvas-text-input");
      if (activeInput) activeInput.remove();
    });

    // --- ФІКСАЦІЯ ЗМІН ТА ОНОВЛЕННЯ В ЧАТІ ---
    scope.listen(saveBtn, "click", () => {
      const finalDataUrl = canvas.toDataURL("image/png");
      if (targetPreviewImg) {
        // Змінюємо src у нашої маленької мініатюри в інпуті
        targetPreviewImg.src = finalDataUrl;

        // Зберігаємо також у спеціальний кастомний дата-атрибут
        if (
          typeof targetFileIndex !== "undefined" &&
          targetFileIndex !== null &&
          scope.window.attachedFiles
        ) {
          // Перетворюємо намальований canvas назад у справжній файл
          scope
            .fetch(finalDataUrl)
            .then((res) => res.blob())
            .then((blob) => {
              // Беремо ім'я старого файлу
              const originalFile = scope.window.attachedFiles[targetFileIndex];
              const fileName = originalFile
                ? originalFile.name
                : "edited_image.png";

              // Створюємо новий файл з малюнками і замінюємо його в масиві
              const editedFile = new File([blob], fileName, {
                type: "image/png",
              });
              scope.window.attachedFiles[targetFileIndex] = editedFile;
            });
        }
      }
      modal.style.display = "none";
    });

    // Додаємо підтримку гарячих клавіш Ctrl+Z / Ctrl+Y всередині модалки
    scope.window.addEventListener("keydown", (e) => {
      if (modal.style.display === "flex") {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          undoBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
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
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  }
  Object.defineProperty(context, "currentChatId", {
    configurable: true,
    get: () => currentChatId,
    set: (value) => {
      currentChatId = value;
    },
  });
  Object.defineProperty(context, "conversations", {
    configurable: true,
    get: () => conversations,
    set: (value) => {
      conversations = value;
    },
  });
  Object.defineProperty(context, "_scrollPending", {
    configurable: true,
    get: () => _scrollPending,
    set: (value) => {
      _scrollPending = value;
    },
  });
  Object.defineProperty(context, "MAX_INLINE_BASE64_LENGTH", {
    configurable: true,
    get: () => MAX_INLINE_BASE64_LENGTH,
  });
  Object.defineProperty(context, "DOM", { configurable: true, get: () => DOM });
  Object.defineProperty(context, "chatBox", {
    configurable: true,
    get: () => chatBox,
  });
  Object.defineProperty(context, "welcomeScreen", {
    configurable: true,
    get: () => welcomeScreen,
  });
  Object.defineProperty(context, "userInput", {
    configurable: true,
    get: () => userInput,
  });
  Object.defineProperty(context, "sendBtn", {
    configurable: true,
    get: () => sendBtn,
  });
  Object.defineProperty(context, "modelSelect", {
    configurable: true,
    get: () => modelSelect,
  });
  Object.defineProperty(context, "historyList", {
    configurable: true,
    get: () => historyList,
  });
  Object.defineProperty(context, "navAvatarImg", {
    configurable: true,
    get: () => navAvatarImg,
  });
  Object.defineProperty(context, "toggleBtn", {
    configurable: true,
    get: () => toggleBtn,
  });
  Object.defineProperty(context, "sidebar", {
    configurable: true,
    get: () => sidebar,
  });
  Object.defineProperty(context, "sidebarOverlay", {
    configurable: true,
    get: () => sidebarOverlay,
  });
  Object.defineProperty(context, "TEXT_FILE_EXTENSIONS", {
    configurable: true,
    get: () => TEXT_FILE_EXTENSIONS,
  });
  Object.defineProperty(context, "EXTENSION_MIME_TYPES", {
    configurable: true,
    get: () => EXTENSION_MIME_TYPES,
  });
  Object.defineProperty(context, "updateUrl", {
    configurable: true,
    get: () => updateUrl,
  });
  Object.defineProperty(context, "toggleChatView", {
    configurable: true,
    get: () => toggleChatView,
  });
  Object.defineProperty(context, "scrollToBottom", {
    configurable: true,
    get: () => scrollToBottom,
  });
  Object.defineProperty(context, "showModal", {
    configurable: true,
    get: () => showModal,
  });
  Object.defineProperty(context, "renameChat", {
    configurable: true,
    get: () => renameChat,
  });
  Object.defineProperty(context, "deleteChat", {
    configurable: true,
    get: () => deleteChat,
  });
  Object.defineProperty(context, "initHistoryListEvents", {
    configurable: true,
    get: () => initHistoryListEvents,
  });
  Object.defineProperty(context, "renderHistoryList", {
    configurable: true,
    get: () => renderHistoryList,
  });
  Object.defineProperty(context, "addConversationToHistory", {
    configurable: true,
    get: () => addConversationToHistory,
  });
  Object.defineProperty(context, "startNewChat", {
    configurable: true,
    get: () => startNewChat,
  });
  Object.defineProperty(context, "getAttachmentExtension", {
    configurable: true,
    get: () => getAttachmentExtension,
  });
  Object.defineProperty(context, "inferAttachmentMime", {
    configurable: true,
    get: () => inferAttachmentMime,
  });
  Object.defineProperty(context, "getAttachmentMime", {
    configurable: true,
    get: () => getAttachmentMime,
  });
  Object.defineProperty(context, "getAttachmentName", {
    configurable: true,
    get: () => getAttachmentName,
  });
  Object.defineProperty(context, "getAttachmentSize", {
    configurable: true,
    get: () => getAttachmentSize,
  });
  Object.defineProperty(context, "getAttachmentImageSrc", {
    configurable: true,
    get: () => getAttachmentImageSrc,
  });
  Object.defineProperty(context, "isDocxFile", {
    configurable: true,
    get: () => isDocxFile,
  });
  Object.defineProperty(context, "isTextLikeFile", {
    configurable: true,
    get: () => isTextLikeFile,
  });
  Object.defineProperty(context, "textToBase64", {
    configurable: true,
    get: () => textToBase64,
  });
  Object.defineProperty(context, "base64ToText", {
    configurable: true,
    get: () => base64ToText,
  });
  Object.defineProperty(context, "blobToText", {
    configurable: true,
    get: () => blobToText,
  });
  Object.defineProperty(context, "inflateRawZipEntry", {
    configurable: true,
    get: () => inflateRawZipEntry,
  });
  Object.defineProperty(context, "findZipEndOfCentralDirectory", {
    configurable: true,
    get: () => findZipEndOfCentralDirectory,
  });
  Object.defineProperty(context, "readZipEntry", {
    configurable: true,
    get: () => readZipEntry,
  });
  Object.defineProperty(context, "docxXmlToText", {
    configurable: true,
    get: () => docxXmlToText,
  });
  Object.defineProperty(context, "extractDocxText", {
    configurable: true,
    get: () => extractDocxText,
  });
  Object.defineProperty(context, "canSendInlineToAI", {
    configurable: true,
    get: () => canSendInlineToAI,
  });
  Object.defineProperty(context, "resizeImageForVision", {
    configurable: true,
    get: () => resizeImageForVision,
  });
  Object.defineProperty(context, "buildAttachmentPayload", {
    configurable: true,
    get: () => buildAttachmentPayload,
  });
  Object.defineProperty(context, "getAttachmentIcon", {
    configurable: true,
    get: () => getAttachmentIcon,
  });
  Object.defineProperty(context, "getAttachmentKind", {
    configurable: true,
    get: () => getAttachmentKind,
  });
  Object.defineProperty(context, "getAttachmentDataUrl", {
    configurable: true,
    get: () => getAttachmentDataUrl,
  });
  Object.defineProperty(context, "ensureFileInspector", {
    configurable: true,
    get: () => ensureFileInspector,
  });
  Object.defineProperty(context, "getAttachmentPreviewText", {
    configurable: true,
    get: () => getAttachmentPreviewText,
  });
  Object.defineProperty(context, "openFileInspector", {
    configurable: true,
    get: () => openFileInspector,
  });
  Object.defineProperty(context, "openImageViewer", {
    configurable: true,
    get: () => openImageViewer,
  });
  Object.defineProperty(context, "buildCopyableUserMessage", {
    configurable: true,
    get: () => buildCopyableUserMessage,
  });
  Object.defineProperty(context, "copyTextToClipboard", {
    configurable: true,
    get: () => copyTextToClipboard,
  });
  Object.defineProperty(context, "showReviewToast", {
    configurable: true,
    get: () => showReviewToast,
  });
  Object.defineProperty(context, "escapeHtml", {
    configurable: true,
    get: () => escapeHtml,
  });
  Object.defineProperty(context, "getCodeLanguageFromClass", {
    configurable: true,
    get: () => getCodeLanguageFromClass,
  });
  Object.defineProperty(context, "getCodeExtension", {
    configurable: true,
    get: () => getCodeExtension,
  });
  Object.defineProperty(context, "highlightCode", {
    configurable: true,
    get: () => highlightCode,
  });
  Object.defineProperty(context, "downloadTextFile", {
    configurable: true,
    get: () => downloadTextFile,
  });
  Object.defineProperty(context, "createCodeActionButton", {
    configurable: true,
    get: () => createCodeActionButton,
  });
  Object.defineProperty(context, "normalizeCodeLanguage", {
    configurable: true,
    get: () => normalizeCodeLanguage,
  });
  Object.defineProperty(context, "getCodeLanguageFromPre", {
    configurable: true,
    get: () => getCodeLanguageFromPre,
  });
  Object.defineProperty(context, "createHighlightedCodeBlock", {
    configurable: true,
    get: () => createHighlightedCodeBlock,
  });
  Object.defineProperty(context, "enhanceCodeBlocks", {
    configurable: true,
    get: () => enhanceCodeBlocks,
  });
  Object.defineProperty(context, "looksLikeRawCodeResponse", {
    configurable: true,
    get: () => looksLikeRawCodeResponse,
  });
  Object.defineProperty(context, "inferCodeLanguageFromText", {
    configurable: true,
    get: () => inferCodeLanguageFromText,
  });
  Object.defineProperty(context, "normalizeBotMarkdown", {
    configurable: true,
    get: () => normalizeBotMarkdown,
  });
  Object.defineProperty(context, "renderMarkdownInto", {
    configurable: true,
    get: () => renderMarkdownInto,
  });
  Object.defineProperty(context, "getPreviousUserMessage", {
    configurable: true,
    get: () => getPreviousUserMessage,
  });
  Object.defineProperty(context, "createBotActionButton", {
    configurable: true,
    get: () => createBotActionButton,
  });
  Object.defineProperty(context, "rateBotMessage", {
    configurable: true,
    get: () => rateBotMessage,
  });
  Object.defineProperty(context, "closeBotMoreMenus", {
    configurable: true,
    get: () => closeBotMoreMenus,
  });
  Object.defineProperty(context, "ensureReasoningPanel", {
    configurable: true,
    get: () => ensureReasoningPanel,
  });
  Object.defineProperty(context, "openReasoningPanel", {
    configurable: true,
    get: () => openReasoningPanel,
  });
  Object.defineProperty(context, "createBotActions", {
    configurable: true,
    get: () => createBotActions,
  });
  Object.defineProperty(context, "getModelIconSrc", {
    configurable: true,
    get: () => getModelIconSrc,
  });
  Object.defineProperty(context, "getModelProviderName", {
    configurable: true,
    get: () => getModelProviderName,
  });
  Object.defineProperty(context, "appendMessage", {
    configurable: true,
    get: () => appendMessage,
  });
  Object.defineProperty(context, "selectChat", {
    configurable: true,
    get: () => selectChat,
  });
  Object.defineProperty(context, "loadConversations", {
    configurable: true,
    get: () => loadConversations,
  });
  Object.defineProperty(context, "adjustHeight", {
    configurable: true,
    get: () => adjustHeight,
  });
  Object.defineProperty(context, "useSuggestion", {
    configurable: true,
    get: () => useSuggestion,
  });
  Object.defineProperty(context, "regenerateBotMessage", {
    configurable: true,
    get: () => regenerateBotMessage,
  });
  Object.defineProperty(context, "sendMessage", {
    configurable: true,
    get: () => sendMessage,
  });
  Object.defineProperty(context, "startVideoPolling", {
    configurable: true,
    get: () => startVideoPolling,
  });
  Object.defineProperty(context, "appendError", {
    configurable: true,
    get: () => appendError,
  });
  Object.defineProperty(context, "initChat", {
    configurable: true,
    get: () => initChat,
  });
  Object.defineProperty(context, "newChatBtn", {
    configurable: true,
    get: () => newChatBtn,
  });
  Object.defineProperty(context, "fileToBase64", {
    configurable: true,
    get: () => fileToBase64,
  });
  scope.expose("updateUrl", updateUrl);
  scope.expose("toggleChatView", toggleChatView);
  scope.expose("scrollToBottom", scrollToBottom);
  scope.expose("showModal", showModal);
  scope.expose("renameChat", renameChat);
  scope.expose("deleteChat", deleteChat);
  scope.expose("initHistoryListEvents", initHistoryListEvents);
  scope.expose("renderHistoryList", renderHistoryList);
  scope.expose("addConversationToHistory", addConversationToHistory);
  scope.expose("startNewChat", startNewChat);
  scope.expose("getAttachmentExtension", getAttachmentExtension);
  scope.expose("inferAttachmentMime", inferAttachmentMime);
  scope.expose("getAttachmentMime", getAttachmentMime);
  scope.expose("getAttachmentName", getAttachmentName);
  scope.expose("getAttachmentSize", getAttachmentSize);
  scope.expose("getAttachmentImageSrc", getAttachmentImageSrc);
  scope.expose("isDocxFile", isDocxFile);
  scope.expose("isTextLikeFile", isTextLikeFile);
  scope.expose("textToBase64", textToBase64);
  scope.expose("base64ToText", base64ToText);
  scope.expose("blobToText", blobToText);
  scope.expose("inflateRawZipEntry", inflateRawZipEntry);
  scope.expose("findZipEndOfCentralDirectory", findZipEndOfCentralDirectory);
  scope.expose("readZipEntry", readZipEntry);
  scope.expose("docxXmlToText", docxXmlToText);
  scope.expose("extractDocxText", extractDocxText);
  scope.expose("canSendInlineToAI", canSendInlineToAI);
  scope.expose("resizeImageForVision", resizeImageForVision);
  scope.expose("buildAttachmentPayload", buildAttachmentPayload);
  scope.expose("getAttachmentIcon", getAttachmentIcon);
  scope.expose("getAttachmentKind", getAttachmentKind);
  scope.expose("getAttachmentDataUrl", getAttachmentDataUrl);
  scope.expose("ensureFileInspector", ensureFileInspector);
  scope.expose("getAttachmentPreviewText", getAttachmentPreviewText);
  scope.expose("openFileInspector", openFileInspector);
  scope.expose("openImageViewer", openImageViewer);
  scope.expose("buildCopyableUserMessage", buildCopyableUserMessage);
  scope.expose("copyTextToClipboard", copyTextToClipboard);
  scope.expose("showReviewToast", showReviewToast);
  scope.expose("escapeHtml", escapeHtml);
  scope.expose("getCodeLanguageFromClass", getCodeLanguageFromClass);
  scope.expose("getCodeExtension", getCodeExtension);
  scope.expose("highlightCode", highlightCode);
  scope.expose("downloadTextFile", downloadTextFile);
  scope.expose("createCodeActionButton", createCodeActionButton);
  scope.expose("normalizeCodeLanguage", normalizeCodeLanguage);
  scope.expose("getCodeLanguageFromPre", getCodeLanguageFromPre);
  scope.expose("createHighlightedCodeBlock", createHighlightedCodeBlock);
  scope.expose("enhanceCodeBlocks", enhanceCodeBlocks);
  scope.expose("looksLikeRawCodeResponse", looksLikeRawCodeResponse);
  scope.expose("inferCodeLanguageFromText", inferCodeLanguageFromText);
  scope.expose("normalizeBotMarkdown", normalizeBotMarkdown);
  scope.expose("renderMarkdownInto", renderMarkdownInto);
  scope.expose("getPreviousUserMessage", getPreviousUserMessage);
  scope.expose("createBotActionButton", createBotActionButton);
  scope.expose("rateBotMessage", rateBotMessage);
  scope.expose("closeBotMoreMenus", closeBotMoreMenus);
  scope.expose("ensureReasoningPanel", ensureReasoningPanel);
  scope.expose("openReasoningPanel", openReasoningPanel);
  scope.expose("createBotActions", createBotActions);
  scope.expose("getModelIconSrc", getModelIconSrc);
  scope.expose("getModelProviderName", getModelProviderName);
  scope.expose("appendMessage", appendMessage);
  scope.expose("selectChat", selectChat);
  scope.expose("loadConversations", loadConversations);
  scope.expose("adjustHeight", adjustHeight);
  scope.expose("useSuggestion", useSuggestion);
  scope.expose("regenerateBotMessage", regenerateBotMessage);
  scope.expose("sendMessage", sendMessage);
  scope.expose("startVideoPolling", startVideoPolling);
  scope.expose("appendError", appendError);
  scope.expose("initChat", initChat);
  scope.expose("fileToBase64", fileToBase64);
  // Gemini Live calls: the reply streams into a bubble while it is spoken, and each
  // finished exchange is saved to this chat (creating it on the first turn).
  let liveTurn = null;
  let liveSaving = Promise.resolve();
  function ensureLiveTurn(user) {
    if (liveTurn) return liveTurn;
    if (!currentChatId) toggleChatView(true);
    const userBubble = user ? appendMessage("user", user) : null;
    const botBubble = appendMessage("bot", "");
    botBubble.classList.add("streaming", "gx-voice-reply");
    const content = botBubble.querySelector(".message-content") || botBubble;
    liveTurn = { userBubble, botBubble, renderer: createStreamingMarkdownRenderer(content, scrollToBottom), markdown: "" };
    return liveTurn;
  }
  scope.listen(scope.document, "genyxo:voice-live", (event) => {
    const detail = event.detail || {};
    const markdown = String(detail.markdown || "");
    const user = String(detail.user || "").trim();
    if (detail.type === "reply" && markdown) {
      const turn = ensureLiveTurn(user);
      turn.markdown = markdown;
      turn.botBubble._botText = markdown;
      turn.botBubble._messageText = markdown;
      turn.renderer.update(markdown);
      return;
    }
    if (detail.type !== "turn" || !markdown) return;
    const turn = ensureLiveTurn(user);
    liveTurn = null;
    turn.botBubble._botText = markdown;
    turn.botBubble._messageText = markdown;
    turn.renderer.flush(markdown);
    turn.botBubble.classList.remove("streaming");
    attachCanvasCard(turn.botBubble, markdown, false);
    // Saved one after another so the first turn's new chat id reaches the next.
    liveSaving = liveSaving.then(async () => {
      try {
        const response = await scope.fetch(`${context.API_BASE_URL}/chat/voice/turn`, {
          method: "POST",
          headers: { Authorization: `Bearer ${context.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: currentChatId || undefined, projectId: !currentChatId && activeProjectId ? activeProjectId : undefined, user, assistant: markdown }),
        });
        const saved = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(saved.message || `Saving failed (${response.status})`);
        if (saved.messageId) turn.botBubble.dataset.messageId = String(saved.messageId);
        if (saved.userMessageId && turn.userBubble) turn.userBubble.dataset.messageId = String(saved.userMessageId);
        if (saved.conversationId && !currentChatId) {
          currentChatId = saved.conversationId;
          updateUrl(saved.conversationId);
          addConversationToHistory({ id: currentChatId, title: saved.conversationTitle || "New chat", model: "google/gemini-3.8-live" });
          if (context.workspaceManaged)
            scope.fetch(`${context.API_BASE_URL}/chat/workspace/conversations/${saved.conversationId}/title-generation`, { method: "POST", headers: { Authorization: `Bearer ${context.token}`, "Content-Type": "application/json" }, body: "{}" }).then(() => scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"))).catch(() => {});
        }
        if (context.workspaceManaged) scope.document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"));
      } catch (error) {
        context.showToast?.("This voice reply couldn't be saved to the chat.", "error");
        console.warn(error);
      }
    });
  });
  if (context.workspaceManaged) {
    scope.listen(scope.document, "genyxo:workspace-data", (event) => {
      conversations = event.detail.conversations || [];
      projects = event.detail.projects || [];
      setActiveProject(activeProjectId);
    });
    scope.listen(scope.document, "genyxo:workspace-select", async (event) => {
      await selectChat(event.detail.id);
      setActiveProject(event.detail.projectId);
      publishWorkspaceState();
    });
    scope.listen(scope.document, "genyxo:generation-finished", (event) => {
      const id = event.detail?.id;
      if (!id || String(currentChatId) !== String(id) || activeSendController) return;
      currentChatId = null;
      selectChat(id);
    });
    scope.listen(scope.document, "genyxo:workspace-new", (event) => {
      startNewChat();
      setActiveProject(event.detail.projectId);
      publishWorkspaceState();
      scope.requestAnimationFrame(() => userInput?.focus());
    });
    scope.listen(scope.document, "genyxo:workspace-preset", (event) => { activePresetId = event.detail.presetId ?? null; });
    // "Try now" on the Plugins page suggests a prompt. The library can also attach
    // a file, and sends only when the person typed the question themselves.
    scope.listen(scope.document, "genyxo:composer-draft", (event) => {
      const draft = String(event.detail?.text || "").slice(0, 2000);
      const files = Array.isArray(event.detail?.files) ? event.detail.files.filter((file) => file instanceof scope.window.File) : [];
      if ((!draft && !files.length) || !userInput || userInput.disabled) return;
      if (files.length) {
        const attached = scope.window.attachedFiles || (scope.window.attachedFiles = []);
        attached.push(...files.slice(0, Math.max(0, 5 - attached.length)));
        scope.window.renderAllPreviews?.();
      }
      userInput.value = draft;
      userInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (event.detail?.send === true && draft) { scope.requestAnimationFrame(() => sendMessage()); return; }
      scope.requestAnimationFrame(() => { userInput.focus(); userInput.setSelectionRange(draft.length, draft.length); });
    });
    scope.listen(scope.document, "genyxo:workspace-active-project", (event) => setActiveProject(event.detail.projectId));
    scope.cleanup(() => activeSendController?.abort());
  }
}
