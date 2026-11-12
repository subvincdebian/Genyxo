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
import english from "../../../../../public/locales/en.json";

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

/** A saved language, or "auto" to follow the browser's preferred languages. */
export type LanguagePreference = Language | "auto";

interface LanguageSnapshot {
  readonly lang: Language;
  readonly translations: TranslationDictionary;
}

interface LanguageContextValue extends LanguageSnapshot {
  readonly preference: LanguagePreference;
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

/** First supported language among the browser's preferences. */
export function detectLanguage(): Language {
  const candidates =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  for (const candidate of candidates) {
    const base = candidate?.toLowerCase().split("-")[0] ?? null;
    if (isLanguage(base)) return base;
  }
  return "en";
}

function initialPreference(): LanguagePreference {
  try {
    const saved = localStorage.getItem("appLang");
    if (saved === "auto" || isLanguage(saved)) return saved;
  } catch {
    // Language selection also works when browser storage is unavailable.
  }
  return "en";
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
    translations: english,
  });
  const [preference, setPreference] = useState<LanguagePreference>("en");
  const snapshot = useRef(state);
  const mounted = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  const changeLanguage = useCallback(
    async (requested: string): Promise<boolean> => {
      const auto = requested === "auto";
      const language = auto ? detectLanguage() : requested;
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
        const next = { lang: effectiveLanguage, translations: { ...english, ...translations } };
        snapshot.current = next;
        setState(next);
        setPreference(auto ? "auto" : effectiveLanguage);
        try {
          localStorage.setItem("appLang", auto ? "auto" : effectiveLanguage);
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
      if (active) void changeLanguage(initialPreference());
    });
    // Keep every open tab on the same language.
    const storage = (event: StorageEvent) => {
      if (event.key === "appLang" && event.newValue)
        void changeLanguage(event.newValue);
    };
    // "Auto-detect" follows browser language changes while the page is open.
    const browser = () => {
      if (initialPreference() === "auto") void changeLanguage("auto");
    };
    window.addEventListener("storage", storage);
    window.addEventListener("languagechange", browser);
    return () => {
      active = false;
      window.removeEventListener("storage", storage);
      window.removeEventListener("languagechange", browser);
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
    () => ({ ...state, preference, t, changeLanguage }),
    [state, preference, t, changeLanguage],
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
