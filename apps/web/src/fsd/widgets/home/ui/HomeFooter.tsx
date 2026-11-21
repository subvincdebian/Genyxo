"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { LANGUAGE_NAMES, LANGUAGES, useLanguage } from "@/shared/i18n";
import { HomeArrow } from "./HomeArrow";

export function HomeFooter({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const { t, lang, changeLanguage } = useLanguage();
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [changingLanguage, setChangingLanguage] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 799px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const groups = [
    { key: "explore", title: t("landing.footer_explore"), links: [
      { href: "/chat", label: t("nav.chat") },
      { href: "#products", label: t("nav.products") },
      { href: "#about", label: t("nav.about") },
    ] },
    { key: "help", title: t("landing.footer_help"), links: [
      { href: "/support", label: t("nav.help_center") },
      { href: "/policies/faq", label: t("landing.footer_faq"), id: "openFaqBtn" },
      { href: "mailto:info@genyxo.com", label: "info@genyxo.com" },
    ] },
    { key: "legal", title: t("landing.footer_legal"), links: [
      { href: "/policies/privacy-policy.html", label: t("landing.footer_privacy") },
      { href: "/policies/terms-of-service.html", label: t("landing.footer_terms") },
    ] },
  ];
  return (
    <footer className="footer gx-footer">
      <div className="gx-footer-top">
        <div className="gx-footer-identity">
          <a className="gx-footer-brand" href="#home" aria-label="Genyxo"><img src="/images/logo.svg" width="42" height="42" alt="" /><strong>Genyxo</strong></a>
          <p>{t("landing.footer_description")}</p>
          <label className="gx-footer-language">
            <span>{t("menu.language")}</span>
            <span className="gx-footer-select">
              <select value={lang} disabled={changingLanguage} onChange={async event => {
                setChangingLanguage(true);
                try { await changeLanguage(event.target.value); }
                finally { setChangingLanguage(false); }
              }}>
                {LANGUAGES.map(language => <option key={language} value={language}>{LANGUAGE_NAMES[language]}</option>)}
              </select>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
            </span>
          </label>
        </div>
        <nav className="gx-footer-nav" aria-label="Genyxo">
          {groups.map(group => {
            const open = !compact || expanded.includes(group.key);
            return <section className="gx-footer-column" key={group.key}>
              <h3><button type="button" aria-expanded={open} aria-controls={`footer-${group.key}`} tabIndex={compact ? 0 : -1}
                onClick={() => { if (compact) setExpanded(current => current.includes(group.key) ? current.filter(key => key !== group.key) : [...current, group.key]); }}>
                {group.title}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
              </button></h3>
              <div className="gx-footer-links" id={`footer-${group.key}`} hidden={!open}>
                {group.links.map(link => <a key={link.href} href={link.href} id={"id" in link ? link.id : undefined}>{link.label}</a>)}
              </div>
            </section>;
          })}
        </nav>
      </div>
      <div className="gx-footer-bottom"><span>© {new Date().getFullYear()} Genyxo</span><a href="#home">{t("landing.back_to_top")} <HomeArrow /></a></div>
      <div className="gx-footer-wordmark" aria-hidden="true">Genyxo</div>
    </footer>
  );
}
