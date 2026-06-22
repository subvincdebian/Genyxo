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
        
        if (typeof loadProducts === 'function') {
            loadProducts();
        }
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
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
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), this.translations);

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
        
        if (typeof loadProducts === 'function') {
            loadProducts(); 
        }
    }

    updateUI() {
        const langDisplay = document.getElementById('currentLangDisplay');
        if (langDisplay) {
            langDisplay.textContent = `${SUPPORTED_LANGUAGES[this.currentLang]} >`;
        }
        document.documentElement.lang = this.currentLang;
    }

    renderLangGrid(gridElement) {
        if (!gridElement) return;
        gridElement.innerHTML = ''; // clearing

        const fragment = document.createDocumentFragment();

        Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
            const btn = document.createElement('button');
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
        const langMenuBtn = document.querySelector('[data-i18n="menu.language"]')?.parentElement;
        const modal = document.getElementById('langModal');
        const closeLangBtn = document.getElementById('closeLangModal');
        const grid = document.getElementById('langGrid');

        if (langMenuBtn && modal && grid) {
            langMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.renderLangGrid(grid);
                modal.style.display = 'flex';
            });

            grid.addEventListener('click', async (e) => {
                const btn = e.target.closest('.lang-btn');
                if (btn && btn.dataset.langCode) {
                    await this.changeLanguage(btn.dataset.langCode);
                    modal.style.display = 'none';
                }
            });
        }

        if (closeLangBtn && modal) {
            closeLangBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const i18n = new LanguageManager();
    i18n.init();
    window.AppI18n = i18n; 
});