"use client";

import type { SyntheticEvent } from "react";
import { useLanguage } from "@/shared/i18n";
import { HomeArrow } from "./HomeArrow";

export function HomeAbout({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const { t } = useLanguage();
  return (
    <section className="about-section gx-about" id="about">
      <div className="gx-about-intro">
        <span className="gx-eyebrow">{t("landing.about_label")}</span>
        <h2>{t("landing.about_title")}</h2>
        <p>{t("landing.about_body")}</p>
        <a href="/chat" className="gx-about-link">{t("landing.open_chat")} <HomeArrow /></a>
      </div>
      <div className="gx-about-flow" aria-label={t("landing.about_label")}>
        {([1, 2, 3] as const).map((step) => (
          <div className="gx-about-step" key={step}>
            <span className="gx-about-number">0{step}</span>
            <div><h3>{t(`landing.about_step_${step}_title`)}</h3><p>{t(`landing.about_step_${step}_body`)}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
