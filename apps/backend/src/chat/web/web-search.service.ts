import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}
export interface WebPage {
  title: string;
  url: string;
  text: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Genyxo/1.0";
const CACHE_TTL = 15 * 60 * 1000;
const PAGE_LIMIT = 2_000_000;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#x27": "'",
  "#x2F": "/",
};
const decode = (text: string) =>
  text
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+\d*);/gi, (match, name: string) => {
      if (ENTITIES[name] !== undefined) return ENTITIES[name];
      if (name.startsWith("#x"))
        return String.fromCodePoint(parseInt(name.slice(2), 16));
      if (name.startsWith("#"))
        return String.fromCodePoint(Number(name.slice(1)));
      return match;
    })
    .replace(/\s+/g, " ")
    .trim();
const stripTags = (html: string) => decode(html.replace(/<[^>]+>/g, " "));

/** True for loopback, private, link-local and other addresses a server must never fetch for a user. */
export function isPrivateAddress(address: string) {
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    if (value === "::1" || value === "::") return true;
    if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb)/.test(value);
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/** Readable text of an HTML page: the article or main part when there is one. */
export function htmlToText(html: string) {
  const title = stripTags(
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "",
  );
  let body = html
    .replace(
      /<(script|style|noscript|svg|template|iframe|form)[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<!--[\s\S]*?-->/g, " ");
  const main = /<(article|main)[^>]*>([\s\S]*?)<\/\1>/i.exec(body)?.[2];
  if (main && main.length > 800) body = main;
  else body = body.replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ");
  const text = decode(
    body
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section)[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n"),
  );
  return { title, text };
}

/**
 * Web search and page reading for the chat's web tools and Deep research.
 * Results come from Brave Search or Tavily when their key is configured, else
 * from DuckDuckGo's lite page with Wikipedia as a fallback, so it works with
 * no key at all. Pages are fetched directly (never private addresses), with
 * the Jina reader as a fallback for pages that need a browser.
 */
@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly config: ConfigService) {}

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value as T;
    const value = await load();
    if (this.cache.size > 300)
      this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  private key(name: string) {
    const value = this.config.get<string>(name);
    return value && !value.startsWith("your_") ? value : "";
  }

  async search(
    query: string,
    limit = 6,
    language?: string,
  ): Promise<WebResult[]> {
    const text = query.trim().slice(0, 300);
    if (!text) return [];
    return this.cached(
      `search:${language || ""}:${limit}:${text.toLowerCase()}`,
      async () => {
        const providers: [string, () => Promise<WebResult[]>][] = [];
        if (this.key("BRAVE_SEARCH_API_KEY"))
          providers.push(["Brave", () => this.brave(text, limit, language)]);
        if (this.key("TAVILY_API_KEY"))
          providers.push(["Tavily", () => this.tavily(text, limit)]);
        providers.push(
          ["DuckDuckGo", () => this.duckDuckGo(text, limit, language)],
          ["Wikipedia", () => this.wikipedia(text, limit, language)],
        );
        for (const [name, run] of providers) {
          try {
            const results = (await run()).filter((result) =>
              /^https?:\/\//.test(result.url),
            );
            if (results.length) return results.slice(0, limit);
          } catch (error: any) {
            this.logger.warn(`${name} search failed: ${error.message}`);
          }
        }
        return [];
      },
    );
  }

  private async brave(query: string, limit: number, language?: string) {
    const params = new URLSearchParams({
      q: query,
      count: String(limit),
      ...(language ? { search_lang: language } : {}),
    });
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.key("BRAVE_SEARCH_API_KEY"),
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data: any = await response.json();
    return (data.web?.results || []).map((item: any) => ({
      title: stripTags(item.title || ""),
      url: item.url,
      snippet: stripTags(item.description || ""),
    }));
  }

  private async tavily(query: string, limit: number) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.key("TAVILY_API_KEY"),
        query,
        max_results: limit,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data: any = await response.json();
    return (data.results || []).map((item: any) => ({
      title: item.title || item.url,
      url: item.url,
      snippet: String(item.content || "").slice(0, 400),
    }));
  }

  private async duckDuckGo(query: string, limit: number, language?: string) {
    const region =
      language === "uk"
        ? "ua-uk"
        : language === "ru"
          ? "ru-ru"
          : language === "de"
            ? "de-de"
            : "wt-wt";
    const response = await fetch(
      `https://lite.duckduckgo.com/lite/?${new URLSearchParams({ q: query, kl: region })}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": language || "en",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`status ${response.status}`);
    const html = await response.text();
    const results: WebResult[] = [];
    const link =
      /<a[^>]+href="([^"]*uddg=([^"&]+)[^"]*)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
    const snippets = [
      ...html.matchAll(
        /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi,
      ),
    ].map((match) => stripTags(match[1]));
    let index = 0;
    for (const match of html.matchAll(link)) {
      const url = decodeURIComponent(match[2]);
      if (
        !/duckduckgo\.com\/y\.js|ad_domain/.test(match[1]) &&
        !results.some((result) => result.url === url)
      )
        results.push({
          title: stripTags(match[3]),
          url,
          snippet: snippets[index] || "",
        });
      index++;
      if (results.length >= limit) break;
    }
    return results;
  }

  private async wikipedia(query: string, limit: number, language?: string) {
    const host = `${language && /^[a-z]{2}$/.test(language) ? language : "en"}.wikipedia.org`;
    const response = await fetch(
      `https://${host}/w/rest.php/v1/search/page?${new URLSearchParams({ q: query, limit: String(Math.min(limit, 5)) })}`,
      {
        headers: { "User-Agent": "Genyxo/1.0 (info@genyxo.com)" },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data: any = await response.json();
    return (data.pages || []).map((page: any) => ({
      title: page.title,
      url: `https://${host}/wiki/${encodeURIComponent(page.key)}`,
      snippet: stripTags(page.excerpt || page.description || ""),
    }));
  }

  /** Fetches a public page and returns its readable text (at most `max` characters). */
  async read(rawUrl: string, max = 9000): Promise<WebPage> {
    return this.cached(`read:${max}:${rawUrl}`, async () => {
      try {
        return await this.readDirect(rawUrl, max);
      } catch (error: any) {
        if (/not allowed|Only http/.test(error.message)) throw error;
        // Pages that need a browser or block plain fetches: the Jina reader renders them.
        const response = await fetch(`https://r.jina.ai/${rawUrl}`, {
          headers: { Accept: "text/plain", "User-Agent": BROWSER_UA },
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok)
          throw new Error(`Could not read the page (${response.status})`);
        const text = (await response.text()).slice(0, PAGE_LIMIT);
        const title = /^Title:\s*(.+)$/m.exec(text)?.[1]?.trim() || rawUrl;
        const body = text.split(/Markdown Content:\s*/)[1] || text;
        return {
          title,
          url: rawUrl,
          text: body.replace(/\n{3,}/g, "\n\n").slice(0, max),
        };
      }
    });
  }

  private async readDirect(rawUrl: string, max: number): Promise<WebPage> {
    let url = new URL(rawUrl);
    for (let hop = 0; hop < 4; hop++) {
      if (url.protocol !== "http:" && url.protocol !== "https:")
        throw new Error("Only http and https pages can be read");
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(host)
        ? [host]
        : (await lookup(host, { all: true })).map((entry) => entry.address);
      if (!addresses.length || addresses.some(isPrivateAddress))
        throw new Error("This address is not allowed");
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        url = new URL(response.headers.get("location")!, url);
        continue;
      }
      if (!response.ok) throw new Error(`The page answered ${response.status}`);
      const type = response.headers.get("content-type") || "";
      if (!/html|text\/plain|xml/.test(type))
        throw new Error("Not a readable page");
      const raw = (await response.text()).slice(0, PAGE_LIMIT);
      const { title, text } = /html|xml/.test(type)
        ? htmlToText(raw)
        : { title: url.hostname, text: raw };
      if (text.length < 200) throw new Error("The page has too little text");
      return {
        title: title || url.hostname,
        url: url.toString(),
        text: text.slice(0, max),
      };
    }
    throw new Error("Too many redirects");
  }
}
