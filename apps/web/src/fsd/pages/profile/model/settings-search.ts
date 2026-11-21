import { SHORTCUTS } from "@/shared/lib/interaction-settings";
import { NOTIFICATION_CATEGORIES } from "@/shared/lib/notification-settings";

/**
 * Every searchable setting: its section, the translation key and English
 * fallback of its visible label (also used to find it on the page), and
 * extra words people search for.
 */
export type SettingEntry = {
  section: string;
  key: string;
  label: string;
  keywords?: string;
};

const e = (
  section: string,
  key: string,
  label: string,
  keywords = "",
): SettingEntry => ({ section, key, label, keywords });

export const SETTINGS_INDEX: SettingEntry[] = [
  e("general", "interface_language", "Interface language", "language locale translate english ukrainian spanish german french auto detect"),
  e("general", "send_key", "Send key combination", "enter shift ctrl newline submit send message keyboard"),
  e("general", "interface_font", "Interface font", "font typeface typography minecraft elden ring dyslexia"),
  e("general", "response_font", "Response font", "font answers reading typography serif"),
  e("general", "animations", "Animations", "motion reduce reduced accessibility transitions"),
  e("profile", "profile_photo", "Profile photo", "avatar picture image upload"),
  e("profile", "name", "Display name", "name username nickname"),
  e("profile", "email", "Email address", "email mail login"),
  e("profile", "available_credits", "Available credits", "balance credits"),
  e("personalization", "instructions", "Custom instructions", "prompt system about me style tone"),
  e("personalization", "response_language", "Response language", "language reply answer"),
  e("personalization", "memory", "Use saved memories", "memory context remember"),
  e("personalization", "timezone", "Time zone", "timezone clock time"),
  e("appearance", "mode", "Mode", "theme dark light system dark mode night"),
  e("appearance", "preset", "Theme preset", "theme colors palette dracula nord catppuccin github"),
  e("appearance", "accent", "Accent", "color accent highlight"),
  e("appearance", "background", "Background", "color background"),
  e("appearance", "foreground", "Foreground", "text color"),
  e("appearance", "import_theme", "Import theme", "theme code paste"),
  e("appearance", "copy_theme", "Copy theme", "export share theme"),
  e("appearance", "ui_font_size", "Interface font size", "text size zoom bigger smaller"),
  e("appearance", "code_font_size", "Code font size", "code size monospace"),
  e("appearance", "separate_modes", "Separate settings for light and dark mode", "light dark separate"),
  e("appearance", "contrast", "Contrast", "contrast readability"),
  e("appearance", "diff_markers", "Code difference markers", "diff changes plus minus"),
  e("notifications", "allow_notifications", "Allow notifications", "push browser desktop permission"),
  ...NOTIFICATION_CATEGORIES.map((item) =>
    e("notifications", `notify_${item.id}`, item.title, `notification alert push email ${item.description}`),
  ),
  e("notifications", "notification_sound", "Notification sound", "sound audio tick mute"),
  e("security", "sign_in_methods", "Sign-in methods", "google facebook login oauth"),
  e("security", "password", "Password", "change password reset credentials"),
  e("security", "active_sessions", "Active sessions", "devices sessions sign out logout"),
  e("security", "all_sessions", "Sign out everywhere", "logout sessions devices"),
  e("security", "security_history", "Security history", "sign in login history activity"),
  e("voice", "microphone", "Microphone", "mic input audio device"),
  e("voice", "microphone_volume", "Microphone volume", "mic level gain"),
  e("voice", "speaker", "Speaker", "output audio headphones"),
  e("voice", "speaker_volume", "Speaker volume", "volume output"),
  e("voice", "voice", "Voice", "voice call assistant speech"),
  e("voice", "call_language", "Language", "voice call language"),
  e("voice", "enable_dictation", "Enable dictation", "dictation speech to text microphone"),
  ...SHORTCUTS.map((item) =>
    e("keyboard", `shortcut_${item.id}`, item.title, `shortcut hotkey keybinding ${item.group}`),
  ),
  e("archive", "archive", "Archived chats", "archive restore old chats history"),
  e("billing", "available_balance", "Available balance", "balance buy credits top up"),
  e("billing", "credit_packs", "Credit packs", "purchases receipts packs bought"),
  e("billing", "transaction_history", "Transaction history", "transactions payments refunds ledger"),
  e("billing", "billing_information", "Billing and payment information", "invoice address name tax vat billing email"),
  e("billing", "payment_methods", "Payment methods", "card visa mastercard credit card saved cards"),
  e("usage", "credit_usage", "Credit usage", "usage statistics spending chart"),
  e("usage", "model_usage", "Usage by model", "models statistics"),
  e("referrals", "your_link", "Your invitation link", "referral invite affiliate friends"),
  e("referrals", "referral_rewards", "Referral rewards", "rewards bonus"),
];

const fold = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export type SearchHit = SettingEntry & { title: string; score: number };

/**
 * Rank settings for a query. Every query word must match the start of a word
 * in the visible label, the section name or the keywords; the label counts most.
 */
export function searchSettings(
  query: string,
  translate: (key: string, fallback: string) => string,
  sectionTitle: (section: string) => string,
  limit = 12,
) {
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const hits: SearchHit[] = [];
  for (const entry of SETTINGS_INDEX) {
    const title = translate(entry.key, entry.label);
    const label = fold(title);
    const english = fold(entry.label);
    const section = fold(sectionTitle(entry.section));
    const extra = fold(entry.keywords || "");
    let score = 0;
    const matched = words.every((word) => {
      const starts = (text: string) =>
        text.startsWith(word) || text.includes(` ${word}`);
      if (label.startsWith(word)) score += 40;
      else if (starts(label)) score += 25;
      else if (starts(english)) score += 18;
      else if (starts(section)) score += 10;
      else if (starts(extra)) score += 8;
      else if (word.length >= 3 && (label.includes(word) || extra.includes(word)))
        score += 3;
      else return false;
      return true;
    });
    if (matched) hits.push({ ...entry, title, score: score - label.length / 100 });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Scroll to a setting on the current page and briefly highlight it. */
export async function revealSetting(title: string) {
  const wanted = fold(title);
  const find = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "#account-content [data-setting-label], #account-content h2, #account-content button, #account-content a",
      ),
    ).find((element) => fold(element.textContent || "") === wanted);
  let target = find();
  // Settings inside a collapsed group ("Additionally") open first.
  const hidden = target?.closest<HTMLElement>("[inert][id]");
  if (hidden) {
    document
      .querySelector<HTMLButtonElement>(`[aria-controls="${hidden.id}"]`)
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 340));
    target = find();
  }
  if (!target) return false;
  const row =
    target.closest<HTMLElement>("[data-setting-row]") ||
    target.closest<HTMLElement>("section") ||
    target;
  const reduced =
    document.documentElement.dataset.gxMotion === "on" ||
    (document.documentElement.dataset.gxMotion !== "off" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches);
  row.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
  row.dataset.searchHit = "true";
  setTimeout(() => delete row.dataset.searchHit, 1800);
  const control = row.querySelector<HTMLElement>(
    "button:not([disabled]), input, [role='combobox'], [role='switch'], a[href]",
  );
  control?.focus({ preventScroll: true });
  return true;
}
