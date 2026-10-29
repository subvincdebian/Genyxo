import {
  cleanFont,
  parseAppearance,
  presets,
  type Appearance,
  type Palette,
} from "./appearance";

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid theme");
  return value as Record<string, unknown>;
};
function hex(value: unknown): string {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value))
    throw Error("Invalid color");
  return value;
}

/** Keep Codex's portable colors/fonts, plus Genyxo's settings for a lossless round trip. */
export function exportTheme(value: Appearance, variant: "light" | "dark") {
  const palette = value[variant];
  return (
    "codex-theme-v1:" +
    JSON.stringify({
      codeThemeId: palette.codeThemeId || palette.preset.toLowerCase(),
      theme: {
        accent: palette.accent,
        accentSource: "custom",
        contrast: value.contrast,
        fonts: palette.fonts || { code: null, ui: "Inter" },
        ink: palette.foreground,
        opaqueWindows: palette.opaqueWindows ?? false,
        semanticColors: palette.semanticColors || {
          diffAdded: "#69c967",
          diffRemoved: "#ff7e78",
          skill: "#c2a1ff",
        },
        surface: palette.background,
      },
      variant,
      genyxo: value,
    })
  );
}

export function importTheme(
  source: string,
  current: Appearance,
): { appearance: Appearance; variant?: "light" | "dark" } {
  if (!source.trim() || source.length > 20000)
    throw Error("Invalid theme length");
  const input = source.trim();
  const prefixed = input.startsWith("codex-theme-v1:");
  const data = record(
    JSON.parse(prefixed ? input.slice("codex-theme-v1:".length) : input),
  );
  // Backwards compatibility with previously exported Genyxo JSON files.
  if (data.light && data.dark && !data.theme) {
    for (const mode of ["light", "dark"] as const) {
      const p = record(data[mode]);
      hex(p.accent);
      hex(p.background);
      hex(p.foreground);
    }
    return { appearance: parseAppearance(data) };
  }
  if (data.variant !== "light" && data.variant !== "dark")
    throw Error("Invalid variant");
  const theme = record(data.theme);
  const fonts = theme.fonts ? record(theme.fonts) : {};
  for (const font of [fonts.ui, fonts.code])
    if (font != null && cleanFont(font) === null) throw Error("Invalid font");
  const semantic = theme.semanticColors ? record(theme.semanticColors) : {};
  const codeThemeId =
    typeof data.codeThemeId === "string" &&
    /^[a-z0-9-]{1,80}$/i.test(data.codeThemeId)
      ? data.codeThemeId
      : undefined;
  const palette: Palette = {
    preset:
      Object.keys(presets).find(
        (name) => name.toLowerCase() === codeThemeId?.toLowerCase(),
      ) || "Custom",
    accent: hex(theme.accent),
    background: hex(theme.surface),
    foreground: hex(theme.ink),
    fonts: { ui: cleanFont(fonts.ui), code: cleanFont(fonts.code) },
    semanticColors: {
      diffAdded: hex(semantic.diffAdded ?? "#69c967"),
      diffRemoved: hex(semantic.diffRemoved ?? "#ff7e78"),
      skill: hex(semantic.skill ?? "#c2a1ff"),
    },
    opaqueWindows: theme.opaqueWindows === true,
    codeThemeId,
  };
  const contrast = theme.contrast ?? current.contrast;
  if (
    typeof contrast !== "number" ||
    !Number.isFinite(contrast) ||
    contrast < 0 ||
    contrast > 100
  )
    throw Error("Invalid contrast");
  const base = data.genyxo ? parseAppearance(record(data.genyxo)) : current;
  return {
    appearance: { ...base, contrast, [data.variant]: palette },
    variant: data.variant,
  };
}
