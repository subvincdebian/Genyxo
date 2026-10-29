export type Palette = {
  preset: string;
  accent: string;
  background: string;
  foreground: string;
  fonts?: { ui: string | null; code: string | null };
  semanticColors?: { diffAdded: string; diffRemoved: string; skill: string };
  opaqueWindows?: boolean;
  codeThemeId?: string;
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
export const cleanFont = (value: unknown): string | null =>
  typeof value === "string" && /^[\w -]{1,80}$/.test(value) ? value : null;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function parseAppearance(raw: unknown): Appearance {
  const value =
    raw && typeof raw === "object" ? (raw as Partial<Appearance>) : {};
  const clean = (input: Partial<Palette> | undefined, light: boolean) => {
    const base = palette(light);
    return {
      preset:
        input?.preset && (presets[input.preset] || input.preset === "Custom")
          ? input.preset
          : "Genyxo",
      accent: color(input?.accent, base.accent),
      background: color(input?.background, base.background),
      foreground: color(input?.foreground, base.foreground),
      ...(input?.fonts
        ? {
            fonts: {
              ui: cleanFont(input.fonts.ui),
              code: cleanFont(input.fonts.code),
            },
          }
        : {}),
      ...(input?.semanticColors
        ? {
            semanticColors: {
              diffAdded: color(input.semanticColors.diffAdded, "#69c967"),
              diffRemoved: color(input.semanticColors.diffRemoved, "#ff7e78"),
              skill: color(input.semanticColors.skill, "#c2a1ff"),
            },
          }
        : {}),
      ...(typeof input?.opaqueWindows === "boolean"
        ? { opaqueWindows: input.opaqueWindows }
        : {}),
      ...(typeof input?.codeThemeId === "string" &&
      /^[a-z0-9-]{1,80}$/i.test(input.codeThemeId)
        ? { codeThemeId: input.codeThemeId }
        : {}),
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
const legacyAliases: Record<string, string> = {
  "--primary-color": "var(--gx-accent)",
  "--dark-color": "var(--gx-surface)",
  "--darker-color": "var(--gx-bg)",
  "--glass-light": "var(--gx-hover)",
  "--glass-border": "var(--gx-border)",
  "--text-light": "var(--gx-text)",
  "--text-gray": "var(--gx-text-2)",
  "--text-dark": "var(--gx-on-accent)",
  "--accent": "var(--gx-accent)",
};
export function applyAppearance(value: Appearance) {
  const root = document.documentElement;
  const light = root.dataset.theme === "light";
  const chosen = light ? value.light : value.dark;
  root.dataset.gxAppearance = "true";
  root.dataset.gxMotion = value.motion;
  root.dataset.gxDiff = value.diff;
  const foreground = readableColor(chosen.foreground, chosen.background, 4.5);
  root.dataset.gxTone =
    contrastRatio("#000000", chosen.background) >
    contrastRatio("#ffffff", chosen.background)
      ? "light"
      : "dark";
  const surface = (fraction: number) => {
    const result = mixColor(chosen.background, foreground, fraction);
    return contrastRatio(foreground, result) >= 4.5
      ? result
      : chosen.background;
  };
  const elevated = surface(0.9);
  const onAccent =
    contrastRatio("#ffffff", chosen.accent) >
    contrastRatio("#000000", chosen.accent)
      ? "#ffffff"
      : "#000000";
  const candidate = mixColor(chosen.accent, "#ffffff", 0.6);
  const gradientEnd =
    contrastRatio(onAccent, candidate) >= 4.5 ? candidate : chosen.accent;
  const vars: Record<string, string> = {
    ...legacyAliases,
    "--gx-hover": `color-mix(in srgb, ${foreground} 7%, transparent)`,
    "--gx-active": `color-mix(in srgb, ${foreground} 11%, transparent)`,
    "--gx-border": `color-mix(in srgb, ${foreground} 12%, transparent)`,
    "--gx-border-strong": `color-mix(in srgb, ${foreground} 20%, transparent)`,
    "--gx-code-keyword": readableColor(chosen.accent, chosen.background, 4.5),
    "--gx-font": chosen.fonts?.ui
      ? `"${chosen.fonts.ui}", Inter, system-ui, sans-serif`
      : "Inter, system-ui, sans-serif",
    "--gx-display": chosen.fonts?.ui
      ? `"${chosen.fonts.ui}", Inter, system-ui, sans-serif`
      : '"Inter Tight", Inter, system-ui, sans-serif',
    "--gx-code-font": chosen.fonts?.code
      ? `"${chosen.fonts.code}", ui-monospace, monospace`
      : "ui-monospace, SFMono-Regular, Consolas, monospace",
    "--gx-diff-added": readableColor(
      chosen.semanticColors?.diffAdded || "#69c967",
      chosen.background,
      4.5,
    ),
    "--gx-diff-removed": readableColor(
      chosen.semanticColors?.diffRemoved || "#ff7e78",
      chosen.background,
      4.5,
    ),
    "--gx-skill": readableColor(
      chosen.semanticColors?.skill || "#c2a1ff",
      chosen.background,
      4.5,
    ),
    "--gx-on-accent": onAccent,
    "--gx-danger": readableColor("#f0897c", elevated, 7),
    "--gx-warning": readableColor("#e9c046", elevated, 7),
    "--gx-info": readableColor("#7fb0ff", elevated, 7),
    "--gx-accent": chosen.accent,
    "--gx-accent-strong": chosen.accent,
    "--gx-accent-hover": mixColor(
      chosen.accent,
      onAccent === "#ffffff" ? "#000000" : "#ffffff",
      0.9,
    ),
    "--gx-mint": chosen.accent,
    "--gx-accent-soft": `color-mix(in srgb, ${chosen.accent} 14%, transparent)`,
    "--gx-accent-glow": `color-mix(in srgb, ${chosen.accent} 32%, transparent)`,
    "--gx-bg": chosen.background,
    "--gx-sidebar": `color-mix(in srgb, ${chosen.background} 94%, black)`,
    "--gx-surface": surface(0.96),
    "--gx-surface-2": surface(0.92),
    "--gx-elevated": elevated,
    "--gx-text": foreground,
    "--gx-text-2": readableColor(
      mixColor(
        foreground,
        chosen.background,
        (70 + value.contrast * 0.2) / 100,
      ),
      elevated,
      4.5,
    ),
    "--gx-muted": readableColor(
      mixColor(
        foreground,
        chosen.background,
        (45 + value.contrast * 0.25) / 100,
      ),
      elevated,
      4.5,
    ),
    "--gx-glass": chosen.opaqueWindows
      ? chosen.background
      : `color-mix(in srgb, ${chosen.background} 94%, transparent)`,
    "--gx-gradient": `linear-gradient(135deg, ${chosen.accent}, ${gradientEnd})`,
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
  for (const key of Object.keys(legacyAliases)) root.style.removeProperty(key);
  delete root.dataset.gxTone;
  delete root.dataset.gxAppearance;
  delete root.dataset.gxMotion;
  delete root.dataset.gxDiff;
}

const channels = (hex: string) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const luminance = (hex: string) =>
  channels(hex)
    .map((n) => {
      const c = n / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, c, index) => sum + c * [0.2126, 0.7152, 0.0722][index], 0);
export function contrastRatio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function mixColor(a: string, b: string, fraction: number) {
  const x = channels(a),
    y = channels(b);
  return (
    "#" +
    x
      .map((c, i) =>
        Math.round(c * fraction + y[i] * (1 - fraction))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function readableColor(color: string, background: string, minimum: number) {
  if (contrastRatio(color, background) >= minimum) return color;
  const target =
    contrastRatio("#ffffff", background) > contrastRatio("#000000", background)
      ? "#ffffff"
      : "#000000";
  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    const candidate = mixColor(target, color, amount);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target;
}
