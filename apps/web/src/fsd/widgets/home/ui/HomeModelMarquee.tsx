"use client";

import { useLanguage } from "@/shared/i18n";

// Each family below has at least one selectable model in the current chat catalogue.
const families = [
  { name: "Claude", icon: "/images/claude-ai.svg", model: "anthropic/claude-opus-4.6" },
  { name: "ChatGPT", icon: "/images/chatgpt-icon.svg", model: "openai/gpt-4o" },
  { name: "Gemini", icon: "/images/google-gemini.svg", model: "google/gemini-2.5-flash" },
  { name: "Nemotron", icon: "/images/nvidia-icon.svg", model: "nvidia/nemotron-3-ultra-550b-a55b:free" },
] as const;

export function HomeModelMarquee() {
  const { t } = useLanguage();
  return <div className="gx-model-marquee" aria-label={t("landing.model_families")}>
    <p className="gx-model-marquee-label">{t("landing.model_families")}</p>
    <div className="gx-model-marquee-viewport">
      <div className="gx-model-marquee-track">
        {[0, 1].map(copy => <div className="gx-model-marquee-set" key={copy} aria-hidden={copy === 1}>
          {families.map(family => <span className="gx-model-family" key={`${copy}-${family.model}`}>
            <img src={family.icon} alt="" width="27" height="27" />
            <span>{family.name}</span>
          </span>)}
        </div>)}
      </div>
    </div>
  </div>;
}
