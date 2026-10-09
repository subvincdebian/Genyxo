// Behavior migrated from chat-inline0; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
let attachedFiles = scope.window.attachedFiles || [];
scope.window.attachedFiles = attachedFiles;
function toggleSidebar() {
  scope.document.getElementById('app').classList.toggle('sidebar-closed');
}
const tx = scope.document.getElementById('userInput');
scope.listen(tx, 'input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});
function setInput(text) {
  const input = scope.document.getElementById('userInput');
  input.value = text;
  input.focus();
}
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
function renderAllPreviews() {
  const previewContainer = scope.document.getElementById('allPreviewItems');
  const featuresGrid = scope.document.querySelector('.features-grid');
  previewContainer.innerHTML = '';
  attachedFiles.forEach((file, index) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      const div = scope.document.createElement('div');
      div.className = 'unified-preview-item unified-preview-img';
      reader.onload = e => {
        div.innerHTML = `
                            <img src="${e.target.result}" alt="preview" title="${file.name}" 
                                style="cursor: pointer; transition: opacity 0.2s;" 
                                onmouseover="this.style.opacity=0.8" 
                                onmouseout="this.style.opacity=1"
                                onclick="window.openImageEditor(this.src, this, ${index})">
                            <button type="button" class="unified-remove-btn" onclick="event.stopPropagation(); removeFile(${index})" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
      };
      reader.readAsDataURL(file);
      previewContainer.appendChild(div);
    } else {
      const div = scope.document.createElement('div');
      div.className = 'unified-preview-item unified-preview-file';
      const fileName = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;
      const fileSize = formatFileSize(file.size);
      div.innerHTML = `
                        <div class="unified-preview-file-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="unified-preview-file-info">
                            <div class="unified-preview-file-name" title="${file.name}">${fileName}</div>
                            <div class="unified-preview-file-size">${fileSize}</div>
                        </div>
                        <button type="button" class="unified-remove-btn" onclick="removeFile(${index})" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
      previewContainer.appendChild(div);
    }
  });
  const previewArea = scope.document.getElementById('unifiedPreviewArea');
  if (attachedFiles.length > 0) {
    previewArea.classList.add('has-items');
    if (featuresGrid) {
      featuresGrid.classList.add('hidden');
    }
  } else {
    previewArea.classList.remove('has-items');
    const userInput = scope.document.getElementById('userInput');
    if (userInput && !userInput.value.trim()) {
      if (featuresGrid) {
        featuresGrid.classList.remove('hidden');
      }
    }
  }
}
scope.window.renderAllPreviews = renderAllPreviews;
scope.window.clearAttachedFiles = function () {
  attachedFiles.length = 0;
  renderAllPreviews();
};
function handleFileSelect(input) {
  if (input.files && input.files[0]) {
    const newFiles = Array.from(input.files);
    const MAX_FILES = 5;
    const MAX_SIZE_MB = 50;
    for (let file of newFiles) {
      if (attachedFiles.length >= MAX_FILES) {
        alert("Maximum 5 files");
        break;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`File ${file.name} exceeds 50MB and won't be added.`);
        continue;
      }
      attachedFiles.push(file);
    }
    renderAllPreviews();
    const menu = scope.document.getElementById('attachmentMenu');
    if (menu) menu.classList.remove('active');
    input.value = '';
  }
}
scope.document.addEventListener('DOMContentLoaded', () => {
  const fileInput = scope.document.getElementById('fileInput');
  const photoInput = scope.document.getElementById('photoInput');
  const plusBtn = scope.document.getElementById('plusBtn');
  const attachMenu = scope.document.getElementById('attachmentMenu');
  const userInput = scope.document.getElementById('userInput');
  const settingsWrappers = scope.document.querySelectorAll('.settings-wrapper');
  const dropZone = scope.document.getElementById('dropZone');
  const dropOverlay = scope.document.getElementById('dropOverlay');
  const MAX_FILES = 5;
  const MAX_SIZE_MB = 50;
  if (plusBtn && attachMenu) {
    scope.listen(plusBtn, 'click', e => {
      e.preventDefault();
      e.stopPropagation();
      attachMenu.classList.toggle('active');
    });
  }
  scope.document.addEventListener('click', e => {
    if (attachMenu && !attachMenu.contains(e.target) && !plusBtn.contains(e.target)) {
      attachMenu.classList.remove('active');
    }
  });
  const closeAllMenus = () => {
    scope.document.querySelectorAll('.gemini-menu.active').forEach(menu => {
      menu.classList.remove('active');
    });
  };
  scope.document.addEventListener('click', e => {
    if (!e.target.closest('.settings-wrapper')) {
      closeAllMenus();
    }
  });
  settingsWrappers.forEach(wrapper => {
    const settingsBtn = wrapper.querySelector('.settings-trigger');
    const settingsMenu = wrapper.querySelector('.gemini-menu');
    if (settingsBtn && settingsMenu) {
      scope.listen(settingsBtn, 'click', e => {
        e.stopPropagation();
        const isOpen = settingsMenu.classList.contains('active');
        scope.document.querySelectorAll('.gemini-menu.active').forEach(m => m.classList.remove('active'));
        if (!isOpen) {
          settingsMenu.classList.add('active');
        }
      });
    }
  });
  if (userInput) {
    scope.listen(userInput, 'input', function () {
      this.style.height = 'auto';
      let newHeight = this.scrollHeight;
      this.style.height = (newHeight > 200 ? 200 : newHeight) + 'px';
      const featuresGrid = scope.document.querySelector('.features-grid');
      if (featuresGrid) {
        if (this.value.trim() || attachedFiles.length > 0) {
          featuresGrid.classList.add('hidden');
        } else {
          featuresGrid.classList.remove('hidden');
        }
      }
    });
  }
  scope.document.addEventListener('paste', e => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.kind === 'file' && item.type.includes('image')) {
        const blob = item.getAsFile();
        if (attachedFiles.length < MAX_FILES && blob.size <= MAX_SIZE_MB * 1024 * 1024) {
          attachedFiles.push(blob);
          renderAllPreviews();
        }
      }
    }
  });
  function handleFiles(files) {
    const newFiles = Array.from(files);
    for (let file of newFiles) {
      if (attachedFiles.length >= MAX_FILES) {
        alert("Maximum 5 files");
        break;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`File ${file.name} exceeds 50MB and won't be added.`);
        continue;
      }
      attachedFiles.push(file);
    }
    renderAllPreviews();
  }
  if (fileInput) {
    scope.listen(fileInput, 'change', e => {
      handleFiles(e.target.files);
      fileInput.value = '';
    });
  }
  if (photoInput) {
    scope.listen(photoInput, 'change', e => {
      handleFiles(e.target.files);
      photoInput.value = '';
    });
  }
  scope.window.removeFile = index => {
    attachedFiles.splice(index, 1);
    renderAllPreviews();
  };
  scope.listen(dropZone, 'dragenter', e => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });
  scope.listen(dropOverlay, 'dragover', e => {
    e.preventDefault();
  });
  scope.listen(dropOverlay, 'dragleave', e => {
    if (e.relatedTarget === null || !dropOverlay.contains(e.relatedTarget)) {
      dropOverlay.classList.remove('active');
    }
  });
  scope.listen(dropOverlay, 'drop', e => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });
});
Object.defineProperty(context, "attachedFiles", { configurable: true, get: () => attachedFiles, set: value => { attachedFiles = value; } });
Object.defineProperty(context, "toggleSidebar", { configurable: true, get: () => toggleSidebar });
Object.defineProperty(context, "tx", { configurable: true, get: () => tx });
Object.defineProperty(context, "setInput", { configurable: true, get: () => setInput });
Object.defineProperty(context, "formatFileSize", { configurable: true, get: () => formatFileSize });
Object.defineProperty(context, "renderAllPreviews", { configurable: true, get: () => renderAllPreviews });
Object.defineProperty(context, "handleFileSelect", { configurable: true, get: () => handleFileSelect });
scope.expose("toggleSidebar", toggleSidebar);
scope.expose("setInput", setInput);
scope.expose("formatFileSize", formatFileSize);
scope.expose("renderAllPreviews", renderAllPreviews);
scope.expose("handleFileSelect", handleFileSelect);

}
