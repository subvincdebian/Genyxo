"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Language = "en" | "uk" | "es" | "de" | "fr";
export type TranslationDictionary = Readonly<Record<string, unknown>>;

export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  en: "English",
  uk: "Українська",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

export const LANGUAGE_FLAGS: Readonly<Record<Language, string>> = {
  en: "🇺🇸",
  uk: "🇺🇦",
  es: "🇪🇸",
  de: "🇩🇪",
  fr: "🇫🇷",
};

export const LANGUAGES: readonly Language[] = ["en", "uk", "es", "de", "fr"];

interface LanguageSnapshot {
  readonly lang: Language;
  readonly translations: TranslationDictionary;
}

interface LanguageContextValue extends LanguageSnapshot {
  readonly t: (key: string, fallback?: string) => string;
  readonly changeLanguage: (language: string) => Promise<boolean>;
}

interface AppI18nCompatibility {
  readonly currentLang: Language;
  readonly translations: TranslationDictionary;
  readonly changeLanguage: (language: string) => Promise<boolean>;
}

declare global {
  interface Window {
    AppI18n?: AppI18nCompatibility;
  }
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(language: string | null): language is Language {
  return language !== null && Object.hasOwn(LANGUAGE_NAMES, language);
}

function isDictionary(value: unknown): value is TranslationDictionary {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem("appLang");
    if (isLanguage(saved)) return saved;
  } catch {
    // Language selection also works when browser storage is unavailable.
  }
  const browser = navigator.language.toLowerCase().split("-")[0];
  return isLanguage(browser) ? browser : "en";
}

async function loadDictionary(
  language: Language,
  signal: AbortSignal,
): Promise<TranslationDictionary> {
  const response = await fetch(`/locales/${language}.json`, { signal });
  if (!response.ok) throw new Error("Unable to load language dictionary");
  const value: unknown = await response.json();
  if (!isDictionary(value)) throw new Error("Invalid language dictionary");
  return value;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server markup and the first client render use the original fallback text.
  const [state, setState] = useState<LanguageSnapshot>({
    lang: "en",
    translations: {},
  });
  const snapshot = useRef(state);
  const mounted = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  const changeLanguage = useCallback(
    async (language: string): Promise<boolean> => {
      if (!isLanguage(language) || !mounted.current) return false;
      activeRequest.current?.abort();
      const request = new AbortController();
      activeRequest.current = request;
      let effectiveLanguage = language;
      try {
        let translations: TranslationDictionary;
        try {
          translations = await loadDictionary(language, request.signal);
        } catch (error) {
          if (request.signal.aborted || language === "en") throw error;
          effectiveLanguage = "en";
          translations = await loadDictionary("en", request.signal);
        }
        if (
          !mounted.current ||
          request.signal.aborted ||
          activeRequest.current !== request
        )
          return false;
        const next = { lang: effectiveLanguage, translations };
        snapshot.current = next;
        setState(next);
        try {
          localStorage.setItem("appLang", effectiveLanguage);
        } catch {
          /* Storage is optional. */
        }
        document.documentElement.lang = effectiveLanguage;
        document.dispatchEvent(
          new CustomEvent("genyxo:language", {
            detail: { lang: effectiveLanguage },
          }),
        );
        return true;
      } catch {
        // Keep the previously loaded dictionary, or the original fallback markup.
        return false;
      } finally {
        if (activeRequest.current === request) activeRequest.current = null;
      }
    },
    [],
  );

  useLayoutEffect(() => {
    mounted.current = true;
    const previous = Object.getOwnPropertyDescriptor(window, "AppI18n");
    const compatibility: AppI18nCompatibility = Object.freeze({
      get currentLang() {
        return snapshot.current.lang;
      },
      get translations() {
        return snapshot.current.translations;
      },
      changeLanguage,
    });
    Object.defineProperty(window, "AppI18n", {
      configurable: true,
      value: compatibility,
    });
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
      activeRequest.current = null;
      if (window.AppI18n !== compatibility) return;
      if (previous) Object.defineProperty(window, "AppI18n", previous);
      else Reflect.deleteProperty(window, "AppI18n");
    };
  }, [changeLanguage]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void changeLanguage(initialLanguage());
    });
    return () => {
      active = false;
    };
  }, [changeLanguage]);

  const t = useCallback(
    (key: string, fallback = key): string => {
      let value: unknown = state.translations;
      for (const segment of key.split(".")) {
        if (!isDictionary(value) || !Object.hasOwn(value, segment))
          return fallback;
        value = value[segment];
      }
      return typeof value === "string" ? value : fallback;
    },
    [state.translations],
  );

  const value = useMemo(
    () => ({ ...state, t, changeLanguage }),
    [state, t, changeLanguage],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage requires LanguageProvider");
  return context;
}
