const SUPPORTED_LANGUAGES = {
    'en': 'English',
    'uk': 'Українська',
    'es': 'Español',
    'de': 'Deutsch',
    'fr': 'Français'
};

class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('appLang') || this.detectBrowserLang() || 'en';
        this.translations = {};
    }

    detectBrowserLang() {
        const browserLang = navigator.language.split('-')[0];
        return SUPPORTED_LANGUAGES[browserLang] ? browserLang : null;
    }

    async init() {
        await this.loadTranslations(this.currentLang);
        this.applyTranslations(); 
        this.updateUI();
        
        if (typeof loadProducts === 'function') {
            loadProducts();
        }

        if (typeof init === 'function') {
             // init(); // Можна розкоментувати, якщо запускати init саме звідси
        }
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            this.translations = await response.json();
        } catch (e) {
            console.error(`Could not load translations for ${lang}`, e);
            if (lang !== 'en') await this.loadTranslations('en');
        }
    }

    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const keys = key.split('.');
            
            let text = this.translations;
            keys.forEach(k => {
                text = text ? text[k] : null;
            });

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
        if (!SUPPORTED_LANGUAGES[lang]) return;
        
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
}

window.i18n = new LanguageManager();

document.addEventListener('DOMContentLoaded', () => {
    window.i18n.init();
});

const FLAGS = {
    'en': '🇺🇸',
    'uk': '🇺🇦',
    'es': '🇪🇸',
    'de': '🇩🇪',
    'fr': '🇫🇷'
};

const langMenuBtn = document.querySelector('[data-i18n="menu.language"]')?.parentElement;

if (langMenuBtn) {
    langMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openLangModal();
    });
}

function openLangModal() {
    const modal = document.getElementById('langModal');
    const grid = document.getElementById('langGrid');
    
    grid.innerHTML = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => `
        <button class="lang-btn ${code === window.i18n.currentLang ? 'active' : ''}" onclick="selectLanguage('${code}')">
            <span class="lang-flag">${FLAGS[code]}</span>
            <span>${name}</span>
            ${code === window.i18n.currentLang ? '<i class="fas fa-check" style="margin-left:auto;"></i>' : ''}
        </button>
    `).join('');
    
    modal.style.display = 'flex';
}

window.selectLanguage = async (lang) => {
    await window.i18n.changeLanguage(lang);
    document.getElementById('langModal').style.display = 'none';
}

const closeLangBtn = document.getElementById('closeLangModal');
if(closeLangBtn) {
    closeLangBtn.addEventListener('click', () => {
        document.getElementById('langModal').style.display = 'none';
    });
}
