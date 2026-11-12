import { decodeEntities, htmlToText } from "../../common/html-text";
import {
  int,
  IntegrationTool,
  n,
  need,
  object,
  s,
  str,
  ToolInputError,
} from "./types";

// Public APIs: no account, no token; requests skip the Authorization header.

const STACK = "https://api.stackexchange.com/2.3";
const decode = decodeEntities;
// Code blocks become fenced Markdown before the remaining tags are removed.
const stripHtml = (html = "") =>
  htmlToText(
    html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, "\n```\n$1\n```\n"),
  );

export const stackOverflowTools: IntegrationTool[] = [
  {
    name: "stackoverflow_search",
    pluginId: "stack-overflow",
    label: "Searching Stack Overflow",
    description:
      "Search Stack Overflow questions by text and optional tags, best matches first.",
    parameters: object(
      {
        query: s("What to search for"),
        tags: s("Semicolon-separated tags, e.g. typescript;nestjs"),
        acceptedOnly: {
          type: "boolean",
          description: "Only questions with an accepted answer",
        },
        limit: n("Up to 20"),
      },
      ["query"],
    ),
    run: async (ctx, args) => {
      const result = await ctx.fetch(`${STACK}/search/advanced`, {
        noAuth: true,
        query: {
          site: "stackoverflow",
          order: "desc",
          sort: "relevance",
          q: need(args, "query", 300),
          tagged: str(args, "tags", { max: 200 }),
          accepted: args.acceptedOnly ? "True" : undefined,
          pagesize: int(args, "limit", 8, 20),
        },
      });
      return result.items.map((item: any) => ({
        id: item.question_id,
        title: decode(item.title),
        score: item.score,
        answers: item.answer_count,
        accepted: Boolean(item.accepted_answer_id),
        tags: item.tags,
        url: item.link,
      }));
    },
  },
  {
    name: "stackoverflow_read",
    pluginId: "stack-overflow",
    label: "Reading answers",
    description:
      "Read a Stack Overflow question with its top answers (accepted first).",
    parameters: object(
      { questionId: n("Question id from stackoverflow_search") },
      ["questionId"],
    ),
    run: async (ctx, args) => {
      const id = int(args, "questionId", 0, 1e10);
      if (!id) throw new ToolInputError('"questionId" is required');
      const [question, answers] = await Promise.all([
        ctx.fetch(`${STACK}/questions/${id}`, {
          noAuth: true,
          query: { site: "stackoverflow", filter: "withbody" },
        }),
        ctx.fetch(`${STACK}/questions/${id}/answers`, {
          noAuth: true,
          query: {
            site: "stackoverflow",
            filter: "withbody",
            sort: "votes",
            order: "desc",
            pagesize: 5,
          },
        }),
      ]);
      const item = question.items?.[0];
      return {
        title: decode(item?.title),
        url: item?.link,
        question: stripHtml(item?.body).slice(0, 5000),
        answers: answers.items
          .sort(
            (a: any, b: any) => Number(b.is_accepted) - Number(a.is_accepted),
          )
          .map((answer: any) => ({
            accepted: answer.is_accepted,
            score: answer.score,
            body: stripHtml(answer.body).slice(0, 6000),
          })),
        license:
          "CC BY-SA — attribute Stack Overflow and the authors when quoting.",
      };
    },
  },
];

const BINANCE = "https://data-api.binance.vision/api/v3";
const symbol = (args: Record<string, any>) =>
  need(args, "symbol", 20)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const binanceTools: IntegrationTool[] = [
  {
    name: "binance_ticker",
    pluginId: "binance",
    label: "Reading Binance prices",
    description:
      "24-hour stats (last price, change %, high, low, volume) for one or more spot pairs like BTCUSDT.",
    parameters: object(
      { symbols: s("Comma-separated pairs, e.g. BTCUSDT,ETHUSDT") },
      ["symbols"],
    ),
    run: async (ctx, args) => {
      const symbols = need(args, "symbols", 400)
        .toUpperCase()
        .split(/[,\s]+/)
        .filter(Boolean)
        .slice(0, 20);
      const rows = await ctx.fetch<any[]>(`${BINANCE}/ticker/24hr`, {
        noAuth: true,
        query: { symbols: JSON.stringify(symbols) },
      });
      return rows.map((row) => ({
        symbol: row.symbol,
        price: row.lastPrice,
        changePercent: row.priceChangePercent,
        high: row.highPrice,
        low: row.lowPrice,
        volume: row.volume,
        quoteVolume: row.quoteVolume,
      }));
    },
  },
  {
    name: "binance_klines",
    pluginId: "binance",
    label: "Reading candles",
    description: "Candlesticks for a spot pair.",
    parameters: object(
      {
        symbol: s("Pair, e.g. SOLUSDT"),
        interval: {
          type: "string",
          enum: ["1m", "5m", "15m", "1h", "4h", "1d", "1w"],
        },
        limit: n("Candles, up to 500"),
      },
      ["symbol", "interval"],
    ),
    run: async (ctx, args) =>
      (
        await ctx.fetch<any[]>(`${BINANCE}/klines`, {
          noAuth: true,
          query: {
            symbol: symbol(args),
            interval: need(args, "interval"),
            limit: int(args, "limit", 50, 500),
          },
        })
      ).map((row) => ({
        open: new Date(row[0]).toISOString(),
        o: row[1],
        h: row[2],
        l: row[3],
        c: row[4],
        volume: row[5],
      })),
  },
  {
    name: "binance_order_book",
    pluginId: "binance",
    label: "Reading order book",
    description: "Top bids and asks for a spot pair.",
    parameters: object(
      { symbol: s("Pair"), limit: n("Levels: 5, 10, 20, 50 or 100") },
      ["symbol"],
    ),
    run: async (ctx, args) =>
      ctx.fetch(`${BINANCE}/depth`, {
        noAuth: true,
        query: {
          symbol: symbol(args),
          limit: [5, 10, 20, 50, 100].includes(Number(args.limit))
            ? Number(args.limit)
            : 10,
        },
      }),
  },
];

const BYBIT = "https://api.bybit.com/v5/market";
const category = (args: Record<string, any>) =>
  ["spot", "linear", "inverse", "option"].includes(String(args.category))
    ? String(args.category)
    : "linear";
const bybit = async (
  fetcher: (url: string, init: any) => Promise<any>,
  path: string,
  query: Record<string, unknown>,
) => {
  const result = await fetcher(`${BYBIT}${path}`, { noAuth: true, query });
  if (result.retCode !== 0) throw new ToolInputError(`Bybit: ${result.retMsg}`);
  return result.result;
};

export const bybitTools: IntegrationTool[] = [
  {
    name: "bybit_tickers",
    pluginId: "bybit",
    label: "Reading Bybit tickers",
    description:
      "Tickers with last price, 24h change, funding rate and open interest (derivatives). category: spot, linear (USDT perps), inverse or option.",
    parameters: object({
      category: {
        type: "string",
        enum: ["spot", "linear", "inverse", "option"],
      },
      symbol: s("Symbol, e.g. BTCUSDT (omit for all)"),
    }),
    run: async (ctx, args) => {
      const result = await bybit(ctx.fetch, "/tickers", {
        category: category(args),
        symbol: str(args, "symbol", { max: 30 })?.toUpperCase(),
      });
      return result.list.slice(0, 50).map((row: any) => ({
        symbol: row.symbol,
        price: row.lastPrice,
        change24h: row.price24hPcnt,
        volume24h: row.volume24h,
        fundingRate: row.fundingRate,
        openInterest: row.openInterest,
        nextFunding: row.nextFundingTime,
      }));
    },
  },
  {
    name: "bybit_kline",
    pluginId: "bybit",
    label: "Reading candles",
    description:
      "Candles for a Bybit symbol. interval in minutes (1,5,15,60,240) or D, W, M.",
    parameters: object(
      {
        category: { type: "string", enum: ["spot", "linear", "inverse"] },
        symbol: s("Symbol"),
        interval: {
          type: "string",
          enum: ["1", "5", "15", "60", "240", "D", "W", "M"],
        },
        limit: n("Up to 500"),
      },
      ["symbol", "interval"],
    ),
    run: async (ctx, args) =>
      (
        await bybit(ctx.fetch, "/kline", {
          category: category(args),
          symbol: symbol(args),
          interval: need(args, "interval"),
          limit: int(args, "limit", 50, 500),
        })
      ).list.map((row: string[]) => ({
        start: new Date(Number(row[0])).toISOString(),
        o: row[1],
        h: row[2],
        l: row[3],
        c: row[4],
        volume: row[5],
      })),
  },
];
