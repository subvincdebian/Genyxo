"use client";
import type { SyntheticEvent } from "react";
import { AvatarNavbar } from "@/entities/session";

import { Localized } from "@/shared/i18n";
import styles from "./SupportNavbar.module.css";

export function SupportNavbar({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <nav className={styles.bar} aria-label="Main">
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label="Home Page">
          <img
            src="/images/logo.svg"
            width="28"
            height="28"
            fetchPriority="high"
            alt=""
          />
          <span>Genyxo</span>
        </a>
        <div className={styles.actions}>
          <div className={styles.links}>
            <Localized
              as="a"
              translationKey="nav.back_home"
              href="/"
              className={styles.link}
              data-i18n="nav.back_home"
            >
              {"Back To Home"}
            </Localized>
            <Localized
              as="a"
              translationKey="nav.chat"
              href="/chat"
              className={styles.link}
              data-i18n="nav.chat"
            >
              {"Chat"}
            </Localized>
          </div>
          <AvatarNavbar ready={ready} />
        </div>
      </div>
    </nav>
  );
}
