/**
 * Lightweight language detection and naming used to keep replies in the
 * user's language. It only needs to be right on clear text: short or
 * ambiguous input returns "" and callers fall back to the user's profile.
 */

const LATIN_STOPWORDS: Record<string, string[]> = {
  en: [
    "the",
    "and",
    "is",
    "you",
    "what",
    "how",
    "this",
    "that",
    "with",
    "for",
    "are",
    "can",
    "please",
    "hello",
  ],
  de: [
    "und",
    "ist",
    "der",
    "die",
    "das",
    "nicht",
    "ich",
    "wie",
    "was",
    "mit",
    "bitte",
    "hallo",
    "ein",
    "eine",
  ],
  fr: [
    "le",
    "la",
    "les",
    "est",
    "et",
    "je",
    "vous",
    "pas",
    "pour",
    "une",
    "des",
    "comment",
    "bonjour",
    "merci",
  ],
  es: [
    "el",
    "la",
    "los",
    "es",
    "y",
    "que",
    "por",
    "para",
    "una",
    "como",
    "qué",
    "hola",
    "gracias",
    "pero",
  ],
  pt: [
    "o",
    "a",
    "os",
    "é",
    "não",
    "que",
    "para",
    "uma",
    "com",
    "como",
    "você",
    "olá",
    "obrigado",
    "está",
  ],
  it: [
    "il",
    "che",
    "è",
    "non",
    "per",
    "una",
    "sono",
    "come",
    "ciao",
    "grazie",
    "della",
    "questo",
    "anche",
  ],
  pl: [
    "nie",
    "jest",
    "się",
    "że",
    "jak",
    "co",
    "to",
    "dla",
    "czy",
    "cześć",
    "dziękuję",
    "proszę",
    "jestem",
  ],
  cs: [
    "je",
    "se",
    "že",
    "jak",
    "co",
    "pro",
    "není",
    "ahoj",
    "děkuji",
    "prosím",
    "jsem",
    "ale",
    "také",
  ],
  sk: [
    "je",
    "sa",
    "že",
    "ako",
    "čo",
    "pre",
    "nie",
    "ahoj",
    "ďakujem",
    "prosím",
    "som",
    "ale",
    "aj",
  ],
  tr: [
    "ve",
    "bir",
    "bu",
    "ne",
    "nasıl",
    "için",
    "değil",
    "merhaba",
    "teşekkürler",
    "evet",
    "hayır",
    "ben",
  ],
  nl: [
    "de",
    "het",
    "een",
    "en",
    "is",
    "niet",
    "ik",
    "je",
    "wat",
    "hoe",
    "hallo",
    "bedankt",
    "dat",
  ],
  ro: [
    "și",
    "este",
    "nu",
    "că",
    "pentru",
    "una",
    "cum",
    "ce",
    "bună",
    "mulțumesc",
    "sunt",
    "care",
  ],
};

const NAMES: Record<string, string> = {
  uk: "Ukrainian",
  ru: "Russian",
  be: "Belarusian",
  bg: "Bulgarian",
  sr: "Serbian",
  kk: "Kazakh",
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  it: "Italian",
  pl: "Polish",
  cs: "Czech",
  sk: "Slovak",
  tr: "Turkish",
  nl: "Dutch",
  ro: "Romanian",
  el: "Greek",
  he: "Hebrew",
  ar: "Arabic",
  hi: "Hindi",
  th: "Thai",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ka: "Georgian",
  hy: "Armenian",
  hu: "Hungarian",
  sv: "Swedish",
  fi: "Finnish",
  da: "Danish",
  no: "Norwegian",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
  vi: "Vietnamese",
  id: "Indonesian",
  fa: "Persian",
  az: "Azerbaijani",
  uz: "Uzbek",
};

/** Main languages people in a country usually write in, most likely first. */
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  UA: ["uk", "ru"],
  RU: ["ru"],
  BY: ["be", "ru"],
  KZ: ["kk", "ru"],
  MD: ["ro", "ru"],
  PL: ["pl"],
  CZ: ["cs"],
  SK: ["sk"],
  DE: ["de"],
  AT: ["de"],
  CH: ["de", "fr", "it"],
  FR: ["fr"],
  BE: ["nl", "fr"],
  NL: ["nl"],
  ES: ["es"],
  MX: ["es"],
  AR: ["es"],
  CO: ["es"],
  PT: ["pt"],
  BR: ["pt"],
  IT: ["it"],
  TR: ["tr"],
  RO: ["ro"],
  BG: ["bg"],
  RS: ["sr"],
  GR: ["el"],
  IL: ["he"],
  SA: ["ar"],
  AE: ["ar"],
  EG: ["ar"],
  IN: ["hi", "en"],
  TH: ["th"],
  JP: ["ja"],
  CN: ["zh"],
  TW: ["zh"],
  KR: ["ko"],
  GE: ["ka"],
  AM: ["hy"],
  HU: ["hu"],
  SE: ["sv"],
  FI: ["fi"],
  DK: ["da"],
  NO: ["no"],
  LT: ["lt"],
  LV: ["lv"],
  EE: ["et"],
  VN: ["vi"],
  ID: ["id"],
  IR: ["fa"],
  AZ: ["az"],
  UZ: ["uz"],
  US: ["en"],
  GB: ["en"],
  CA: ["en", "fr"],
  AU: ["en"],
  NZ: ["en"],
  IE: ["en"],
};

export function baseLanguage(code?: string | null) {
  const base = String(code || "")
    .toLowerCase()
    .split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(base) ? base : "";
}

export function languageName(code?: string | null) {
  const base = baseLanguage(code);
  return NAMES[base] || base;
}

export function countryLanguages(country?: string | null) {
  return COUNTRY_LANGUAGES[String(country || "").toUpperCase()] || [];
}

export function detectTextLanguage(input: string): string {
  // Code, links and markup say nothing about the language the person writes in.
  const text = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .toLowerCase();
  const letters = text.match(/\p{L}/gu) || [];
  if (letters.length < 2) return "";
  const count = (pattern: RegExp) => (text.match(pattern) || []).length;
  const share = (n: number) => n / letters.length;

  if (share(count(/[぀-ヿ]/g)) > 0.1) return "ja";
  if (share(count(/[가-힯]/g)) > 0.3) return "ko";
  if (share(count(/[一-鿿]/g)) > 0.3) return "zh";
  if (share(count(/[֐-׿]/g)) > 0.5) return "he";
  if (share(count(/[؀-ۿ]/g)) > 0.5) return count(/[پچژگ]/g) ? "fa" : "ar";
  if (share(count(/[ऀ-ॿ]/g)) > 0.5) return "hi";
  if (share(count(/[฀-๿]/g)) > 0.5) return "th";
  if (share(count(/[Ͱ-Ͽ]/g)) > 0.5) return "el";
  if (share(count(/[Ⴀ-ჿ]/g)) > 0.5) return "ka";
  if (share(count(/[԰-֏]/g)) > 0.5) return "hy";

  const cyrillic = count(/[Ѐ-ӿ]/g);
  if (share(cyrillic) > 0.5) {
    const uk =
      count(/[іїєґ]/g) +
      count(
        /(^|\s)(що|це|як|та|й|мені|привіт|дякую|будь|будь ласка)(?=\s|$|[,.!?])/g,
      );
    const ru =
      count(/[ыэъё]/g) +
      count(
        /(^|\s)(что|это|как|мне|привет|спасибо|пожалуйста|и)(?=\s|$|[,.!?])/g,
      );
    const be = count(/[ў]/g);
    const kk = count(/[әғқңөұүһ]/g);
    if (kk) return "kk";
    if (be && be >= uk) return "be";
    if (uk > ru) return "uk";
    if (ru > uk) return "ru";
    return "";
  }

  const words = text.match(/\p{L}+/gu) || [];
  const scores = Object.entries(LATIN_STOPWORDS).map(
    ([code, list]): [string, number] => [
      code,
      words.filter((word) => list.includes(word)).length,
    ],
  );
  // Letters unique to one language settle close calls between neighbours.
  const bonus: Record<string, RegExp> = {
    de: /[äöüß]/g,
    fr: /[çœèêàù]/g,
    es: /[ñ¿¡]/g,
    pt: /[ãõç]/g,
    pl: /[ąęłńśźż]/g,
    cs: /[ěřů]/g,
    sk: /[ľĺŕôä]/g,
    tr: /[ğış]/g,
    ro: /[ăâîșț]/g,
  };
  for (const entry of scores) {
    const pattern = bonus[entry[0]];
    if (pattern) entry[1] += count(pattern) * 0.6;
  }
  scores.sort((a, b) => b[1] - a[1]);
  const [best, second] = scores;
  if (best[1] >= 1 && best[1] > second[1]) return best[0];
  return "";
}
