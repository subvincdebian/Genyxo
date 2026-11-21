"use client";
import { useRef, type SyntheticEvent } from "react";
import { useLanguage } from "@/shared/i18n";
import { useHomeMotion } from "../model/use-home-motion";
import { HomeArrow } from "./HomeArrow";
import { HomeModelMarquee } from "./HomeModelMarquee";

export function HomeHome({}: { dispatch: (name: string, event: SyntheticEvent<Element>) => unknown; ready: boolean }) {
  const { t } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useHomeMotion(root, canvas);
  return <section ref={root} className="gx-hero" id="home">
    <div className="gx-atmosphere" aria-hidden="true"><div className="gx-light gx-light-a"/><div className="gx-light gx-light-b"/><div className="gx-light gx-light-c"/></div>
    <canvas ref={canvas} className="gx-code-field" aria-hidden="true"/>
    <div className="gx-hero-copy">
      <img className="gx-brain" src="/images/logo.svg" width="64" height="64" alt="Genyxo"/>
      <p className="gx-eyebrow">{t("landing.eyebrow")}</p>
      <h1><span className="gx-title-line"><span>{t("landing.title")}</span></span><span className="gx-title-line"><span>{t("landing.title_end")}</span></span></h1>
      <p className="gx-intro">{t("landing.intro")}</p>
      <div className="gx-actions"><a className="gx-button" href="/chat">{t("landing.open_chat")} <HomeArrow /></a><a className="gx-button gx-button-soft" href="#products">{t("landing.credits")} <HomeArrow direction="down" /></a></div>
    </div>
    <HomeModelMarquee />
    <div className="gx-workspace-scene" id="workspace">
      <div className="gx-workspace-sticky">
        <div className="gx-scene-heading"><span className="gx-eyebrow">{t("landing.workspace")}</span><span className="gx-scroll-cue">{t("landing.scroll")} <HomeArrow direction="down" /></span></div>
        <div className="gx-scene-stage">
          <aside className="gx-story-card gx-story-one">
            <span className="gx-story-index">01 / 02</span>
            <h3>{t("landing.about_step_1_title")}</h3>
            <p>{t("landing.about_step_1_body")}</p>
          </aside>
          <aside className="gx-story-card gx-story-two">
            <span className="gx-story-index">02 / 02</span>
            <h3>{t("landing.about_step_2_title")}</h3>
            <p>{t("landing.about_step_2_body")}</p>
          </aside>
          <a className="gx-workspace-frame" href="/chat" aria-label={t("landing.open_chat")}>
            <div className="gx-window-bar"><span className="gx-window-dots" aria-hidden="true">● ● ●</span><span>genyxo / workspace</span><HomeArrow /></div>
            <div className="gx-workspace-capture">
              <img src="/images/workspace-preview.png" width="2560" height="1440" alt={t("landing.preview_alt")} loading="eager"/>
              <span className="gx-frame-focus gx-focus-model" aria-hidden="true" />
              <span className="gx-frame-focus gx-focus-composer" aria-hidden="true" />
            </div>
          </a>
          <div className="gx-mobile-chat-tour" aria-label={t("landing.preview_alt")}>
            <div className="gx-mobile-shot gx-mobile-shot-model"><img src="/images/workspace-preview.png" width="2560" height="1440" alt="" loading="lazy"/><span>01 <strong>{t("landing.about_step_1_title")}</strong></span></div>
            <div className="gx-mobile-shot gx-mobile-shot-start"><img src="/images/workspace-preview.png" width="2560" height="1440" alt="" loading="lazy"/><span>02 <strong>{t("landing.mobile_start")}</strong></span></div>
            <div className="gx-mobile-shot gx-mobile-shot-message"><img src="/images/workspace-preview.png" width="2560" height="1440" alt="" loading="lazy"/><span>03 <strong>{t("landing.mobile_message")}</strong></span></div>
            <a href="/chat" className="gx-mobile-tour-link">{t("landing.open_chat")} <HomeArrow /></a>
          </div>
        </div>
      </div>
    </div>
    <div className="gx-product-statement"><span className="gx-eyebrow">{t("landing.statement_label")}</span><h2>{t("landing.statement")}</h2><p className="gx-statement-detail">{t("landing.about_step_3_body")}</p></div>
  </section>;
}
