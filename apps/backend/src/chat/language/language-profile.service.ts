import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "../message.entity";
import { baseLanguage, countryLanguages, detectTextLanguage } from "./language";

export type LanguageSignals = {
  /** Two-letter country from the CDN or proxy in front of the API. */
  country?: string;
  /** navigator.languages from the browser, most preferred first. */
  locales?: string[];
};

/** Country headers set by common CDNs and proxies; none exist on localhost. */
const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-appengine-country",
];

export function countryFromHeaders(
  headers: Record<string, string | string[] | undefined>,
) {
  for (const name of COUNTRY_HEADERS) {
    const value = headers[name];
    const code = String(Array.isArray(value) ? value[0] : value || "")
      .trim()
      .toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") return code;
  }
  return "";
}

/**
 * Works out which languages a user most likely writes and speaks, in the
 * spirit of ChatGPT's recommendations: what they wrote before weighs most,
 * then where they are, then their browser settings.
 */
@Injectable()
export class LanguageProfileService {
  private readonly cache = new Map<
    number,
    { at: number; languages: string[] }
  >();

  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  async historyLanguages(userId: number) {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.at < 5 * 60_000) return cached.languages;
    const rows = await this.messages.find({
      where: { userId, sender: "user" },
      select: { id: true, content: true },
      order: { id: "DESC" },
      take: 60,
    });
    const counts = new Map<string, number>();
    rows.forEach((row, index) => {
      const code = detectTextLanguage(String(row.content || "").slice(0, 2000));
      // Recent messages count a little more than old ones.
      if (code)
        counts.set(code, (counts.get(code) || 0) + (index < 15 ? 1.5 : 1));
    });
    const languages = [...counts.entries()]
      .filter(([, score]) => score >= 1.5)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);
    this.cache.set(userId, { at: Date.now(), languages });
    return languages;
  }

  forget(userId: number) {
    this.cache.delete(userId);
  }

  async preferredLanguages(userId: number, signals: LanguageSignals = {}) {
    const history = await this.historyLanguages(userId).catch(() => []);
    const ordered = [
      ...history,
      ...countryLanguages(signals.country),
      ...(signals.locales || []).map(baseLanguage),
    ].filter(Boolean);
    return [...new Set(ordered)].slice(0, 4);
  }
}
