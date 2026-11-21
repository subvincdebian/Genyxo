"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
import { LanguageGrid } from "@/features/language";
import styles from "./SupportLangModal.module.css";

// The page controller shows #langModal by setting its inline display to flex
// and hides it again from #closeLangModal.
export function SupportLangModal({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className={styles.overlay} id="langModal">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="langModalTitle"
      >
        <button
          type="button"
          className={styles.close}
          id="closeLangModal"
          aria-label="Close"
        >
          <i className="fas fa-times" aria-hidden="true"></i>
        </button>
        <Localized
          as="h2"
          translationKey="language.select"
          className={styles.title}
          id="langModalTitle"
          data-i18n="language.select"
        >
          {"Select Language"}
        </Localized>
        <div className={styles.grid} id="langGrid">
          <LanguageGrid />
        </div>
      </div>
    </div>
  );
}
