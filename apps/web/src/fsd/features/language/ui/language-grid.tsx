"use client";

import { useEffect, useRef, useState } from "react";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  LANGUAGES,
  useLanguage,
} from "@/shared/i18n";
import type { Language } from "@/shared/i18n";

export function LanguageGrid() {
  const { lang, changeLanguage } = useLanguage();
  const [pending, setPending] = useState<Language | null>(null);
  const [error, setError] = useState("");
  const latestSelection = useRef(0);

  useEffect(
    () => () => {
      latestSelection.current++;
    },
    [],
  );

  async function selectLanguage(language: Language) {
    const selection = ++latestSelection.current;
    setPending(language);
    setError("");
    const loaded = await changeLanguage(language);
    if (selection !== latestSelection.current) return;
    setPending(null);
    if (loaded) {
      const modal = document.getElementById("langModal");
      if (modal) modal.style.display = "none";
    } else {
      setError("Unable to load this language. Please try again.");
    }
  }

  return (
    <>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-btn ${code === lang ? "active" : ""}`}
          data-lang-code={code}
          aria-pressed={code === lang}
          aria-busy={pending === code}
          onClick={() => {
            void selectLanguage(code);
          }}
        >
          <span className="lang-flag">{LANGUAGE_FLAGS[code]}</span>
          <span>{LANGUAGE_NAMES[code]}</span>
          {code === lang && (
            <i
              className="fas fa-check"
              style={{ marginLeft: "auto" }}
              aria-hidden="true"
            />
          )}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
