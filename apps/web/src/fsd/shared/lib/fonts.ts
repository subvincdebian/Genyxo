/**
 * Font catalog for the interface and AI response typography preferences.
 * Web fonts are fetched from Google Fonts (already allowed by the CSP) only
 * when someone selects them, so unused families never cost a request.
 */
export type FontCategory = "default" | "sans" | "serif" | "mono" | "readable" | "fun";
export type FontOption = {
  id: string;
  label: string;
  category: FontCategory;
  /** CSS font-family stack. */
  stack: string;
  /** Google Fonts css2 `family=` value, when the font is a web font. */
  google?: string;
};

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, Consolas, monospace";
const web = (
  id: string,
  label: string,
  category: FontCategory,
  weights: string,
  fallback: string,
): FontOption => ({
  id,
  label,
  category,
  stack: `"${label}", ${fallback}`,
  google: `${label.replaceAll(" ", "+")}:wght@${weights}`,
});

export const FONT_OPTIONS: readonly FontOption[] = [
  { id: "default", label: "Default", category: "default", stack: "" },
  { id: "system", label: "System", category: "default", stack: SANS },
  web("inter", "Inter", "sans", "400;500;600;700", SANS),
  web("geist", "Geist", "sans", "400;500;600;700", SANS),
  web("roboto", "Roboto", "sans", "400;500;600;700", SANS),
  web("open-sans", "Open Sans", "sans", "400;500;600;700", SANS),
  web("lato", "Lato", "sans", "400;700", SANS),
  web("montserrat", "Montserrat", "sans", "400;500;600;700", SANS),
  web("poppins", "Poppins", "sans", "400;500;600;700", SANS),
  web("nunito", "Nunito", "sans", "400;500;600;700", SANS),
  web("manrope", "Manrope", "sans", "400;500;600;700", SANS),
  web("dm-sans", "DM Sans", "sans", "400;500;600;700", SANS),
  web("plus-jakarta", "Plus Jakarta Sans", "sans", "400;500;600;700", SANS),
  web("outfit", "Outfit", "sans", "400;500;600;700", SANS),
  web("figtree", "Figtree", "sans", "400;500;600;700", SANS),
  web("ibm-plex-sans", "IBM Plex Sans", "sans", "400;500;600;700", SANS),
  web("source-sans", "Source Sans 3", "sans", "400;500;600;700", SANS),
  web("work-sans", "Work Sans", "sans", "400;500;600;700", SANS),
  web("rubik", "Rubik", "sans", "400;500;600;700", SANS),
  web("atkinson", "Atkinson Hyperlegible", "readable", "400;700", SANS),
  web("lexend", "Lexend", "readable", "400;500;600;700", SANS),
  web("merriweather", "Merriweather", "serif", "400;700", SERIF),
  web("lora", "Lora", "serif", "400;500;600;700", SERIF),
  web("source-serif", "Source Serif 4", "serif", "400;500;600;700", SERIF),
  web("literata", "Literata", "serif", "400;500;600;700", SERIF),
  web("playfair", "Playfair Display", "serif", "400;500;600;700", SERIF),
  web("jetbrains-mono", "JetBrains Mono", "mono", "400;500;600;700", MONO),
  web("ibm-plex-mono", "IBM Plex Mono", "mono", "400;500;600;700", MONO),
  web("fira-code", "Fira Code", "mono", "400;500;600;700", MONO),
  {
    id: "minecraft",
    label: "Minecraft",
    category: "fun",
    stack: `"Pixelify Sans", ${SANS}`,
    google: "Pixelify+Sans:wght@400;500;600;700",
  },
  {
    id: "elden-ring",
    label: "Elden Ring",
    category: "fun",
    stack: `"Cinzel", ${SERIF}`,
    google: "Cinzel:wght@400;500;600;700",
  },
];

/** The response font can also follow whatever the interface uses. */
export const REPLY_FONT_OPTIONS: readonly FontOption[] = [
  { id: "inherit", label: "Same as interface", category: "default", stack: "" },
  ...FONT_OPTIONS.filter((font) => font.id !== "default"),
];

export const findFont = (id: string | undefined) =>
  [...FONT_OPTIONS, ...REPLY_FONT_OPTIONS].find((font) => font.id === id);
export const isFontId = (value: unknown, reply = false): value is string =>
  typeof value === "string" &&
  (reply ? REPLY_FONT_OPTIONS : FONT_OPTIONS).some((font) => font.id === value);

const FONT_HOST = "https://fonts.googleapis.com/css2";
function attach(id: string, href: string) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

/** Load the full family for a selected font (idempotent). */
export function ensureFont(id: string | undefined) {
  const font = findFont(id);
  if (!font?.google) return;
  attach(`gx-font-${font.id}`, `${FONT_HOST}?family=${font.google}&display=swap`);
}

/** Load only the glyphs needed to render every option name in its own face. */
export function loadFontPreviews() {
  const fonts = FONT_OPTIONS.filter((font) => font.google);
  const families = fonts
    .map((font) => `family=${font.google!.split(":")[0]}`)
    .join("&");
  const glyphs = [...new Set(fonts.map((font) => font.label).join("") + "Aa")]
    .sort()
    .join("");
  attach(
    "gx-font-previews",
    `${FONT_HOST}?${families}&text=${encodeURIComponent(glyphs)}&display=swap`,
  );
}

/** Resolve once the chosen face can paint, so swaps never flash a fallback. */
export async function fontReady(id: string | undefined, timeout = 1500) {
  const font = findFont(id);
  if (!font?.google || typeof document === "undefined") return;
  ensureFont(font.id);
  const family = font.google.split(":")[0].replaceAll("+", " ");
  await Promise.race([
    document.fonts
      .load(`400 16px "${family}"`)
      .then(() => undefined)
      .catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeout)),
  ]);
}
