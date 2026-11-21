/**
 * Billing address rules. Mirrored in
 * apps/web/src/fsd/shared/lib/billing-rules.ts; the server is authoritative.
 */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS " +
  "MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS " +
  "RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

const POSTAL: Record<string, RegExp> = {
  US: /^\d{5}(?:-\d{4})?$/,
  CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
  GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  UA: /^\d{5}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  ES: /^\d{5}$/,
  IT: /^\d{5}$/,
  PL: /^\d{2}-\d{3}$/,
  NL: /^\d{4} ?[A-Z]{2}$/i,
  JP: /^\d{3}-?\d{4}$/,
  IN: /^\d{6}$/,
  AU: /^\d{4}$/,
  BR: /^\d{5}-?\d{3}$/,
};
const GENERIC_POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/;
/** Countries whose addresses normally have no postal code. */
const NO_POSTAL = new Set(
  "AE AG AO AW BF BI BJ BO BS BW BZ CD CF CG CI CK CM DJ DM ER FJ GA GD GH GM GQ GY HK KI KM KN KP LY ML MO MR MW NA NR NU QA RW SB SC SL SO SR SS ST SY TD TF TG TK TL TO TT TV UG VU YE ZW".split(
    " ",
  ),
);

export const postalRequired = (country: string) => !NO_POSTAL.has(country);
export const validPostal = (country: string, value: string) =>
  (POSTAL[country] || GENERIC_POSTAL).test(value);

/**
 * Plain text only: no control characters, no bidirectional overrides (used to
 * disguise text) and no markup characters.
 */
const MARKUP = /[<>{}`\\]/;
const invisible = (code: number) =>
  code <= 0x1f ||
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x202a && code <= 0x202e) ||
  (code >= 0x2066 && code <= 0x2069) ||
  code === 0xfeff;
export const UNSAFE_TEXT = {
  test: (value: string) =>
    MARKUP.test(value) ||
    Array.from(value).some((char) => invisible(char.codePointAt(0)!)),
};

export const clean = (value: unknown) =>
  typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/g, " ")
    : "";
