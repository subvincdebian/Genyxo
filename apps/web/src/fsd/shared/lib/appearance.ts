export type Palette = {
  preset: string;
  accent: string;
  background: string;
  foreground: string;
};
export type Appearance = {
  separate: boolean;
  light: Palette;
  dark: Palette;
  uiSize: number;
  codeSize: number;
  motion: "system" | "on" | "off";
  contrast: number;
  diff: "color" | "markers";
};
export const presets: Record<
  string,
  { dark: string; light: string; accent: string }
> = {
  Genyxo: { dark: "#0c0d0d", light: "#f8faf9", accent: "#39a994" },
  Linear: { dark: "#0f0f11", light: "#fafafa", accent: "#6671e8" },
  Dracula: { dark: "#282a36", light: "#f9f7ff", accent: "#bd93f9" },
  Nord: { dark: "#2e3440", light: "#eceff4", accent: "#88c0d0" },
  Catppuccin: { dark: "#1e1e2e", light: "#eff1f5", accent: "#cba6f7" },
  GitHub: { dark: "#0d1117", light: "#ffffff", accent: "#2f81f7" },
  Gruvbox: { dark: "#282828", light: "#fbf1c7", accent: "#d79921" },
  Everforest: { dark: "#2d353b", light: "#fdf6e3", accent: "#a7c080" },
  Ayu: { dark: "#0b0e14", light: "#fafafa", accent: "#e6b450" },
};
const palette = (light: boolean): Palette => ({
  preset: "Genyxo",
  accent: "#39a994",
  background: light ? "#f8faf9" : "#0c0d0d",
  foreground: light ? "#171c1a" : "#f3f5f4",
});
export const defaultAppearance: Appearance = {
  separate: false,
  light: palette(true),
  dark: palette(false),
  uiSize: 14,
  codeSize: 13,
  motion: "system",
  contrast: 60,
  diff: "color",
};
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function parseAppearance(raw: unknown): Appearance {
  const value =
    raw && typeof raw === "object" ? (raw as Partial<Appearance>) : {};
  const clean = (input: Partial<Palette> | undefined, light: boolean) => {
    const base = palette(light);
    return {
      preset: input?.preset && presets[input.preset] ? input.preset : "Genyxo",
      accent: color(input?.accent, base.accent),
      background: color(input?.background, base.background),
      foreground: color(input?.foreground, base.foreground),
    };
  };
  return {
    separate: value.separate === true,
    light: clean(value.light, true),
    dark: clean(value.dark, false),
    uiSize: Math.max(12, Math.min(20, Number(value.uiSize) || 14)),
    codeSize: Math.max(10, Math.min(20, Number(value.codeSize) || 13)),
    motion:
      value.motion === "on" || value.motion === "off" ? value.motion : "system",
    contrast: Math.max(
      0,
      Math.min(
        100,
        Number.isFinite(Number(value.contrast)) ? Number(value.contrast) : 60,
      ),
    ),
    diff: value.diff === "markers" ? "markers" : "color",
  };
}
export function readAppearance() {
  try {
    return parseAppearance(
      JSON.parse(localStorage.getItem("genyxo.appearance") || "null"),
    );
  } catch {
    return parseAppearance(null);
  }
}
export function saveAppearance(value: Appearance) {
  localStorage.setItem("genyxo.appearance", JSON.stringify(value));
  document.dispatchEvent(new Event("genyxo:appearance"));
}
export function applyAppearance(value: Appearance) {
  const root = document.documentElement;
  const light = root.dataset.theme === "light";
  const chosen = light ? value.light : value.dark;
  root.dataset.gxAppearance = "true";
  root.dataset.gxMotion = value.motion;
  root.dataset.gxDiff = value.diff;
  const vars: Record<string, string> = {
    "--gx-on-accent":
      parseInt(chosen.accent.slice(1, 3), 16) * 0.299 +
        parseInt(chosen.accent.slice(3, 5), 16) * 0.587 +
        parseInt(chosen.accent.slice(5, 7), 16) * 0.114 >
      150
        ? "#13251c"
        : "#ffffff",
    "--gx-accent": chosen.accent,
    "--gx-accent-strong": chosen.accent,
    "--gx-mint": chosen.accent,
    "--gx-accent-soft": `color-mix(in srgb, ${chosen.accent} 14%, transparent)`,
    "--gx-accent-glow": `color-mix(in srgb, ${chosen.accent} 32%, transparent)`,
    "--gx-bg": chosen.background,
    "--gx-sidebar": `color-mix(in srgb, ${chosen.background} 94%, ${light ? "black" : "black"})`,
    "--gx-surface": `color-mix(in srgb, ${chosen.background} 96%, ${chosen.foreground})`,
    "--gx-surface-2": `color-mix(in srgb, ${chosen.background} 92%, ${chosen.foreground})`,
    "--gx-elevated": `color-mix(in srgb, ${chosen.background} 90%, ${chosen.foreground})`,
    "--gx-text": chosen.foreground,
    "--gx-text-2": `color-mix(in srgb, ${chosen.foreground} ${70 + value.contrast * 0.2}%, ${chosen.background})`,
    "--gx-muted": `color-mix(in srgb, ${chosen.foreground} ${45 + value.contrast * 0.25}%, ${chosen.background})`,
    "--gx-glass": `color-mix(in srgb, ${chosen.background} 94%, transparent)`,
    "--gx-gradient": `linear-gradient(135deg, ${chosen.accent}, color-mix(in srgb, ${chosen.accent} 60%, white))`,
    "--gx-ui-size": `${value.uiSize}px`,
    "--gx-code-size": `${value.codeSize}px`,
  };
  for (const [key, val] of Object.entries(vars))
    root.style.setProperty(key, val);
}
export function clearAppearance() {
  const root = document.documentElement;
  for (const key of Array.from(root.style))
    if (key.startsWith("--gx-")) root.style.removeProperty(key);
  delete root.dataset.gxAppearance;
  delete root.dataset.gxMotion;
  delete root.dataset.gxDiff;
}
