// Behavior migrated from i18n.js; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'uk': 'Українська',
  'es': 'Español',
  'de': 'Deutsch',
  'fr': 'Français'
};
const FLAGS = {
  'en': '🇺🇸',
  'uk': '🇺🇦',
  'es': '🇪🇸',
  'de': '🇩🇪',
  'fr': '🇫🇷'
};
class LanguageManager {
  constructor() {
    this.currentLang = localStorage.getItem('appLang') || this.detectBrowserLang() || 'en';
    this.translations = {};
    this.isInitialized = false;
  }
  detectBrowserLang() {
    const browserLang = navigator.language.split('-')[0];
    return SUPPORTED_LANGUAGES[browserLang] ? browserLang : null;
  }
  async init() {
    await this.loadTranslations(this.currentLang);
    this.applyTranslations();
    this.updateUI();
    this.initDOMEvents();
    this.isInitialized = true;
    if (typeof context.loadProducts === 'function') {
      context.loadProducts();
    }
  }
  async loadTranslations(lang) {
    try {
      const response = await scope.fetch(`/locales/${lang}.json`);
      if (!response.ok) throw new Error('Network response error');
      this.translations = await response.json();
    } catch (e) {
      console.error(`Could not load translations for ${lang}`, e);
      if (lang !== 'en') {
        await this.loadTranslations('en');
      }
    }
  }
  applyTranslations() {
    const elements = scope.document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = key.split('.').reduce((obj, i) => obj ? obj[i] : null, this.translations);
      if (text) {
        if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      }
    });
  }
  async changeLanguage(lang) {
    if (!SUPPORTED_LANGUAGES[lang] || lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem('appLang', lang);
    await this.loadTranslations(lang);
    this.applyTranslations();
    this.updateUI();
    if (typeof context.loadProducts === 'function') {
      context.loadProducts();
    }
  }
  updateUI() {
    const langDisplay = scope.document.getElementById('currentLangDisplay');
    if (langDisplay) {
      langDisplay.textContent = `${SUPPORTED_LANGUAGES[this.currentLang]} >`;
    }
    scope.document.documentElement.lang = this.currentLang;
  }
  renderLangGrid(gridElement) {
    if (!gridElement) return;
    gridElement.innerHTML = ''; // clearing

    const fragment = scope.document.createDocumentFragment();
    Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
      const btn = scope.document.createElement('button');
      btn.className = `lang-btn ${code === this.currentLang ? 'active' : ''}`;
      btn.dataset.langCode = code;
      btn.innerHTML = `
                <span class="lang-flag">${FLAGS[code]}</span>
                <span>${name}</span>
                ${code === this.currentLang ? '<i class="fas fa-check" style="margin-left:auto;"></i>' : ''}
            `;
      fragment.appendChild(btn);
    });
    gridElement.appendChild(fragment);
  }
  initDOMEvents() {
    const langMenuBtn = scope.document.querySelector('[data-i18n="menu.language"]')?.parentElement;
    const modal = scope.document.getElementById('langModal');
    const closeLangBtn = scope.document.getElementById('closeLangModal');
    const grid = scope.document.getElementById('langGrid');
    if (langMenuBtn && modal && grid) {
      scope.listen(langMenuBtn, 'click', e => {
        e.preventDefault();
        this.renderLangGrid(grid);
        modal.style.display = 'flex';
      });
      scope.listen(grid, 'click', async e => {
        const btn = e.target.closest('.lang-btn');
        if (btn && btn.dataset.langCode) {
          await this.changeLanguage(btn.dataset.langCode);
          modal.style.display = 'none';
        }
      });
    }
    if (closeLangBtn && modal) {
      scope.listen(closeLangBtn, 'click', () => {
        modal.style.display = 'none';
      });
    }
  }
}
scope.document.addEventListener('DOMContentLoaded', () => {
  const i18n = new LanguageManager();
  i18n.init();
  scope.window.AppI18n = i18n;
});
Object.defineProperty(context, "SUPPORTED_LANGUAGES", { configurable: true, get: () => SUPPORTED_LANGUAGES });
Object.defineProperty(context, "FLAGS", { configurable: true, get: () => FLAGS });
Object.defineProperty(context, "LanguageManager", { configurable: true, get: () => LanguageManager });


}
