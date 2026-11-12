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

export type ThemeMode = "light" | "dark" | "system";
/** A versioned, complete snapshot; safe to paste into another browser/account. */
export function exportTheme(
  value: Appearance,
  variant: "light" | "dark",
  options?: { mode?: ThemeMode; language?: string },
) {
  return JSON.stringify(
    {
      format: "genyxo-theme",
      version: 1,
      appearance: parseAppearance(value),
      mode: options?.mode || variant,
      ...(options?.language ? { language: options.language } : {}),
    },
    null,
    2,
  );
}

export function importTheme(
  source: string,
  current: Appearance,
): {
  appearance: Appearance;
  variant?: "light" | "dark";
  mode?: ThemeMode;
  language?: string;
} {
  if (!source.trim() || source.length > 20000)
    throw Error("Invalid theme length");
  const input = source.trim();
  const prefix = ["genyxo-theme:", "codex-theme-v1:"].find((prefix) =>
    input.startsWith(prefix),
  );
  const data = record(JSON.parse(prefix ? input.slice(prefix.length) : input));
  if (data.format === "genyxo-theme") {
    if (
      data.version !== 1 ||
      !["system", "light", "dark"].includes(String(data.mode))
    )
      throw Error("Invalid theme version or mode");
    const appearance = record(data.appearance);
    for (const mode of ["light", "dark"] as const) {
      const p = record(appearance[mode]);
      hex(p.accent);
      hex(p.background);
      hex(p.foreground);
    }
    if (
      data.language !== undefined &&
      !["en", "uk", "de", "es", "fr"].includes(String(data.language))
    )
      throw Error("Invalid language");
    return {
      appearance: parseAppearance(appearance),
      mode: data.mode as ThemeMode,
      ...(typeof data.language === "string" ? { language: data.language } : {}),
    };
  }
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
