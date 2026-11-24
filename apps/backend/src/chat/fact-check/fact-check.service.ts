import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import type { ServerResponse } from "http";
import { Message } from "../message.entity";
import { Conversation } from "../conversation.entity";
import { ChatProject } from "../project.entity";
import { documentEvidence, documentsFrom } from "./documents";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ChatService } from "../chat.service";
import { PricingService, ModelType } from "../pricing.service";
import { WebSearchService } from "../web/web-search.service";
import { UsersService } from "../../users/users.service";
import { TransactionType } from "../../transactions/transaction.entity";
import { detectTextLanguage, languageName } from "../language/language";
import { labelOf } from "../routing/model-router";
import type {
  CheckScope,
  CheckedClaim,
  ClaimSource,
  FactCheckResult,
  Verdict,
} from "./fact-check.types";

const MAX_CLAIMS = 6;
const VERDICTS: Verdict[] = ["supported", "disputed", "false", "unverified"];
const WEIGHT: Record<Verdict, number> = {
  supported: 1,
  unverified: 0.5,
  disputed: 0.25,
  false: 0,
};

/** The first JSON object in a model reply, tolerating fences and chatter. */
export function parseJsonObject<T>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Answer text a reader can check: no code, cards or markup noise. */
export function checkableText(answer: string) {
  return answer
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .slice(0, 12_000)
    .trim();
}

const squash = (text: string) =>
  text
    .replace(/[*_`#>~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * The sentences of a page that share the most words with a claim, in page
 * order, up to `limit` characters.
 */
export function relevantPassages(text: string, claim: string, limit = 1600) {
  const words = new Set(
    claim
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2),
  );
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 20 && sentence.length < 600);
  const scored = sentences
    .map((sentence, index) => ({
      index,
      sentence,
      score: sentence
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => words.has(word)).length,
    }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score);
  const picked: typeof scored = [];
  let length = 0;
  for (const item of scored) {
    if (length + item.sentence.length > limit) continue;
    picked.push(item);
    length += item.sentence.length;
  }
  return picked
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" … ");
}

/** "source [2]" or "[2]" in an explanation becomes the site's name. */
export function nameSources(
  text: string,
  results: { url: string; title?: string; kind?: string }[],
) {
  const site = (index: string) => {
    const source = results[Number(index) - 1];
    if (source?.kind === "document") return `"${source.title}"`;
    const url = source?.url;
    if (!url) return "";
    try {
      const host = new URL(url).hostname.replace(/^www\./, "").split(".");
      const name = host.length > 2 ? host[host.length - 2] : host[0];
      return name.length <= 4
        ? name.toUpperCase()
        : name[0].toUpperCase() + name.slice(1);
    } catch {
      return "";
    }
  };
  return text
    .replace(
      /\b(sources?)\s*(?:\[(\d+)\]|#?(\d+)\b)/gi,
      (match, _word, bracketed?: string, bare?: string) =>
        site(bracketed || bare || "") || match,
    )
    .replace(/\s?\[(\d+)\]/g, (_match, index: string) =>
      site(index) ? ` (${site(index)})` : "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function scoreClaims(claims: CheckedClaim[]) {
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<
    Verdict,
    number
  >;
  claims.forEach((claim) => counts[claim.verdict]++);
  const score = claims.length
    ? Math.round(
        (claims.reduce((sum, claim) => sum + WEIGHT[claim.verdict], 0) /
          claims.length) *
          100,
      )
    : 100;
  return { counts, score };
}

function summarize(counts: Record<Verdict, number>, total: number) {
  if (!total) return "No specific facts to check in this answer.";
  const parts: string[] = [];
  parts.push(
    counts.supported === total
      ? `All ${total} claims are backed by sources.`
      : `${counts.supported} of ${total} claims are backed by sources.`,
  );
  if (counts.false)
    parts.push(
      `${counts.false} ${counts.false === 1 ? "looks" : "look"} wrong.`,
    );
  if (counts.disputed)
    parts.push(
      `${counts.disputed} ${counts.disputed === 1 ? "is" : "are"} disputed.`,
    );
  if (counts.unverified)
    parts.push(`${counts.unverified} could not be confirmed.`);
  return parts.join(" ");
}

/**
 * Checks a reply with a second model: it lists the reply's factual claims,
 * searches the web for each one and judges it against what the pages say.
 * Progress streams to the browser; the result is saved on the message.
 */
@Injectable()
export class FactCheckService {
  private readonly logger = new Logger(FactCheckService.name);
  private readonly running = new Set<number>();

  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    private chat: ChatService,
    private pricing: PricingService,
    private search: WebSearchService,
    private users: UsersService,
    @Optional()
    @InjectRepository(Conversation)
    private conversations?: Repository<Conversation>,
    @Optional()
    @InjectRepository(ChatProject)
    private projects?: Repository<ChatProject>,
    @Optional() private knowledge?: KnowledgeService,
  ) {}

  /** Text files shared in this chat before the answer, and its project's files. */
  private async documents(message: Message, userId: number) {
    const turns = await this.messages.find({
      where: {
        conversationId: message.conversationId,
        sender: "user",
        id: LessThan(message.id),
      },
      order: { id: "DESC" },
      take: 40,
      select: ["id", "files"],
    });
    const conversation = await this.conversations?.findOne({
      where: { id: message.conversationId, userId },
      select: ["id", "projectId"],
    });
    const project = conversation?.projectId
      ? await this.projects?.findOne({
          where: { id: conversation.projectId, userId },
        })
      : null;
    const files = documentsFrom(
      turns.flatMap((turn) => turn.files || []),
      project?.files || [],
    );
    // The project's knowledge base counts as the user's documents too.
    const knowledge =
      conversation?.projectId && this.knowledge
        ? await this.knowledge
            .documentsFor(userId, conversation.projectId)
            .catch(() => [])
        : [];
    return [
      ...files,
      ...knowledge.map((document) => ({
        name: document.name,
        origin: "project" as const,
        chunks: document.chunks,
      })),
    ];
  }

  /**
   * A different model than the one that wrote the answer: the free model
   * that verifies most reliably, unless the user picked one.
   */
  pickVerifier(answerModel: string, requested?: string) {
    const valid = (model?: string) =>
      Boolean(model) &&
      model !== answerModel &&
      this.pricing.getModelConfig(model!)?.type === ModelType.TEXT &&
      !/embedding|robotics|audio|live-translate/.test(model!);
    if (valid(requested)) return requested!;
    return answerModel === "google/gemini-3.5-flash"
      ? "google/gemini-2.5-flash"
      : "google/gemini-3.5-flash";
  }

  /**
   * Another free model to finish the check with. When Google's quota is the
   * problem, every Gemini model fails the same way, so it leaves Google.
   */
  private fallbackFor(verifier: string, answerModel: string, error?: unknown) {
    const quota = /\b429\b|quota|rate.?limit/i.test(
      String((error as Error)?.message || ""),
    );
    const options =
      quota && verifier.startsWith("google/")
        ? [
            "nvidia/nemotron-3-ultra-550b-a55b:free",
            "google/gemma-4-31b-it:free",
          ]
        : [
            "google/gemini-3.5-flash",
            "google/gemini-2.5-flash",
            "nvidia/nemotron-3-ultra-550b-a55b:free",
          ];
    return options.find(
      (model) => model !== verifier && model !== answerModel,
    )!;
  }

  async run(
    userId: number,
    messageId: number,
    requested: string | undefined,
    res: ServerResponse,
    requestedScope?: CheckScope,
  ) {
    const message = await this.messages.findOne({
      where: { id: messageId, userId },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.sender !== "bot" || message.type !== "text")
      throw new BadRequestException("Only text answers can be fact-checked");
    const text = checkableText(message.content);
    if (text.length < 20)
      throw new BadRequestException("This answer has nothing to fact-check");
    if (this.running.has(messageId))
      throw new ConflictException("This answer is already being checked");

    let verifier = this.pickVerifier(message.model, requested);
    const cost = this.pricing.getCost(verifier);
    if (cost > 0 && !(await this.users.deductCredits(userId, cost)))
      throw new ForbiddenException("Not enough credits");

    this.running.add(messageId);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const send = (event: object) => {
      if (!res.destroyed && res.writable !== false)
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 150_000);
    const question = await this.messages.findOne({
      where: {
        conversationId: message.conversationId,
        sender: "user",
        id: LessThan(message.id),
      },
      order: { id: "DESC" },
      select: ["id", "content"],
    });
    const language = languageName(detectTextLanguage(text));
    // With documents in the chat or project the answer is checked against
    // them, and nothing from them goes to a search engine unless asked.
    const documents = await this.documents(message, userId).catch(() => []);
    const scope: CheckScope = !documents.length
      ? "web"
      : requestedScope === "web" || requestedScope === "both"
        ? requestedScope
        : "documents";
    const useWeb = scope !== "documents";
    const useDocuments = scope !== "web";

    // One call with the chosen verifier, falling back to a Gemini model once.
    let switched = false;
    const ask = async (system: string, prompt: string) => {
      try {
        const reply = await this.chat.completeText(
          verifier,
          system,
          prompt,
          controller.signal,
          { maxTokens: 1800, json: true },
        );
        if (parseJsonObject(reply)) return reply;
        throw new Error("The verifier did not return JSON");
      } catch (error) {
        if (controller.signal.aborted) throw error;
        // Switch once; later failures retry on the model already in use.
        if (switched)
          return this.chat.completeText(
            verifier,
            system,
            prompt,
            controller.signal,
            { maxTokens: 1800, json: true },
          );
        switched = true;
        const fallback = this.fallbackFor(verifier, message.model, error);
        this.logger.warn(
          `Fact-check with ${verifier} failed (${(error as Error).message}); using ${fallback}`,
        );
        verifier = fallback;
        send({
          status: "verifier",
          verifier,
          verifierLabel: labelOf(verifier),
        });
        return this.chat.completeText(
          verifier,
          system,
          prompt,
          controller.signal,
          {
            maxTokens: 1800,
            json: true,
          },
        );
      }
    };

    try {
      send({ status: "verifier", verifier, verifierLabel: labelOf(verifier) });
      send({
        status: "scope",
        scope,
        documents: documents.map((document) => document.name),
      });
      send({ status: "step", step: "Finding the claims" });
      type Extracted = {
        claims?: { quote?: string; claim?: string; query?: string }[];
      };
      const extractionSystem = [
        "You are a meticulous fact-checker.",
        `From the ANSWER, pick at most ${MAX_CLAIMS} specific, checkable factual claims: dates, numbers, names, events, places, prices, scientific or technical facts, quotes.`,
        "Skip opinions, advice, instructions, code, hypotheticals and statements that are trivially true.",
        "Prefer the claims a reader would most regret getting wrong.",
        "Judge the ANSWER on its own: its statements count even when the QUESTION asked for that exact wording. The QUESTION is only context.",
        ...(useDocuments
          ? [
              `The user shared documents (${documents.map((document) => document.name).join(", ")}). Also pick what the answer says about them: amounts, dates, deadlines, parties, obligations, figures, clause or section numbers.`,
            ]
          : []),
        'For each claim give "quote": an exact, contiguous excerpt copied character for character from the answer (5 to 25 words) that states it; "claim": the claim as one standalone sentence; "query": a short web search query that would confirm or refute it.',
        'Reply with JSON only: {"claims":[{"quote":"...","claim":"...","query":"..."}]}. If nothing is checkable reply {"claims":[]}.',
      ].join("\n");
      const extractionPrompt = `QUESTION:\n${(question?.content || "").slice(0, 2000)}\n\nANSWER:\n${text}`;
      let extracted = parseJsonObject<Extracted>(
        await ask(extractionSystem, extractionPrompt),
      );
      // Models sometimes find nothing in an answer full of figures; a second
      // model gets one more look before the answer is called uncheckable.
      if (
        !extracted?.claims?.length &&
        (/\d/.test(text) || text.length > 160)
      ) {
        const second = this.fallbackFor(verifier, message.model);
        extracted =
          parseJsonObject<Extracted>(
            await this.chat
              .completeText(
                second,
                extractionSystem,
                extractionPrompt,
                controller.signal,
                { maxTokens: 1800, json: true },
              )
              .catch(() => ""),
          ) || extracted;
      }
      const plain = squash(text);
      const claims = (extracted?.claims || [])
        .filter((item) => item?.claim && (item.query || !useWeb))
        .slice(0, MAX_CLAIMS)
        .map((item, index) => ({
          id: `c${index + 1}`,
          // A quote that is not in the answer is still checked, just not underlined.
          quote:
            item.quote && plain.includes(squash(item.quote))
              ? item.quote.trim()
              : "",
          claim: String(item.claim).trim().slice(0, 400),
          query: String(item.query || item.claim)
            .trim()
            .slice(0, 200),
        }));
      send({
        status: "claims",
        claims: claims.map(({ id, quote, claim }) => ({ id, quote, claim })),
      });

      const checked: CheckedClaim[] = [];
      const today = new Date().toISOString().slice(0, 10);
      const judge = async (claim: (typeof claims)[number]) => {
        const passages = useDocuments
          ? documentEvidence(documents, claim.claim)
          : [];
        send({
          status: "claim-step",
          id: claim.id,
          step: useWeb
            ? "Searching the web"
            : passages.length
              ? `Reading ${passages[0].name}`
              : "Searching your documents",
        });
        const results = useWeb
          ? await this.search.search(claim.query, 5).catch(() => [])
          : [];
        // The top pages are read in full and cut down to the passages about
        // the claim, so the judge sees the sentence that settles it.
        const pages = await Promise.all(
          results.slice(0, 3).map((result) =>
            Promise.race([
              this.search
                .read(result.url, 20_000)
                .then((page) => relevantPassages(page.text, claim.claim))
                .catch(() => ""),
              new Promise<string>((resolve) =>
                setTimeout(() => resolve(""), 8000),
              ),
            ]),
          ),
        );
        send({
          status: "claim-step",
          id: claim.id,
          step:
            results.length + passages.length
              ? `Reading ${results.length + passages.length} source${results.length + passages.length === 1 ? "" : "s"}`
              : "Weighing the evidence",
        });
        // Documents first: the user's own files are the record being checked.
        const pool: ClaimSource[] = [
          ...passages.map((passage) => ({
            kind: "document" as const,
            title: passage.page
              ? `${passage.name}, p. ${passage.page}`
              : passage.name,
            url: "",
            excerpt: passage.text.slice(0, 420),
          })),
          ...results.map((result) => ({
            kind: "web" as const,
            title: result.title,
            url: result.url,
          })),
        ];
        const evidence = [
          ...passages.map(
            (passage, index) =>
              `[${index + 1}] Document "${passage.name}", ${passage.page ? `page ${passage.page}` : `part ${passage.fragment + 1}`}:\n${passage.text}`,
          ),
          ...results.map(
            (result, index) =>
              `[${passages.length + index + 1}] ${result.title} — ${result.url}\n${result.snippet}${
                pages[index] ? `\n${pages[index]}` : ""
              }`,
          ),
        ].join("\n\n");
        const against =
          scope === "documents"
            ? "the user's own documents"
            : scope === "both"
              ? "the user's own documents and web search results"
              : "web search evidence";
        const verdict = parseJsonObject<{
          verdict?: string;
          confidence?: number;
          explanation?: string;
          correction?: string;
          sources?: number[];
        }>(
          await ask(
            [
              `You verify one claim against ${against}. Today is ${today}.`,
              "Verdicts: supported = the evidence confirms it; disputed = the evidence partly conflicts, is outdated, or sources disagree; false = the evidence contradicts it; unverified = the evidence does not address it.",
              "Be strict: never say supported unless a source states it. Do not use outside knowledge to call something supported.",
              ...(passages.length
                ? [
                    "A claim about what a document says is decided by that document, even if web pages say otherwise. Check exact numbers, dates, names and wording.",
                  ]
                : []),
              "Name documents by file name and web sources by their site (for example NASA or Wikipedia), never by number, and do not mention snippets, parts or the evidence format.",
              `Write "explanation" (one or two sentences on what the sources say) and "correction" (the accurate statement, only for false or disputed) in ${language}.`,
              'Reply with JSON only: {"verdict":"supported|disputed|false|unverified","confidence":0.0,"explanation":"...","correction":"...","sources":[1]} where sources are the numbers of the sources you relied on.',
            ].join("\n"),
            `CLAIM: ${claim.claim}\n\nEVIDENCE:\n${evidence || "(nothing relevant was found)"}`,
          ),
        );
        const used: ClaimSource[] = [
          ...new Set((verdict?.sources || []).map(Number)),
        ]
          .map((index) => pool[index - 1])
          .filter(Boolean);
        const kind = VERDICTS.includes(verdict?.verdict as Verdict)
          ? (verdict!.verdict as Verdict)
          : "unverified";
        const result: CheckedClaim = {
          id: claim.id,
          quote: claim.quote,
          claim: claim.claim,
          verdict:
            kind === "supported" && !used.length && !pool.length
              ? "unverified"
              : kind,
          confidence: Math.max(
            0,
            Math.min(1, Number(verdict?.confidence) || 0.5),
          ),
          explanation: nameSources(
            String(
              verdict?.explanation ||
                "The sources found did not settle this claim.",
            ),
            pool,
          ).slice(0, 600),
          correction:
            kind === "false" || kind === "disputed"
              ? String(verdict?.correction || "").slice(0, 400) || undefined
              : undefined,
          sources: used.length ? used : pool.slice(0, 2),
        };
        checked.push(result);
        send({ status: "verdict", claim: result });
      };
      // A few at a time keeps the search providers and free models happy.
      const queue = [...claims];
      await Promise.all(
        Array.from({ length: Math.min(3, queue.length) }, async () => {
          while (queue.length && !controller.signal.aborted) {
            const next = queue.shift()!;
            // One retry: a free model or search provider often blips once.
            await judge(next)
              .catch((error) => {
                if (controller.signal.aborted) throw error;
                return judge(next);
              })
              .catch((error) => {
                if (controller.signal.aborted) throw error;
                this.logger.warn(`Claim check failed: ${error.message}`);
                const failed: CheckedClaim = {
                  id: next.id,
                  quote: next.quote,
                  claim: next.claim,
                  verdict: "unverified",
                  confidence: 0,
                  explanation: "This claim could not be checked right now.",
                  sources: [],
                };
                checked.push(failed);
                send({ status: "verdict", claim: failed });
              });
          }
        }),
      );

      const ordered = claims
        .map((claim) => checked.find((item) => item.id === claim.id))
        .filter(Boolean) as CheckedClaim[];
      const { counts, score } = scoreClaims(ordered);
      const result: FactCheckResult = {
        verifier,
        verifierLabel: labelOf(verifier),
        answerModel: message.model,
        checkedAt: new Date().toISOString(),
        claims: ordered,
        counts,
        scope,
        documents: documents.map((document) => document.name),
        score,
        summary: summarize(counts, ordered.length),
      };
      await this.messages.update(
        { id: message.id, userId },
        { meta: { ...(message.meta || {}), factCheck: result } },
      );
      // A fallback to a cheaper model is charged at the cheaper price.
      const spent = Math.min(cost, this.pricing.getCost(verifier));
      if (cost > spent) await this.users.addCredits(userId, cost - spent);
      if (spent > 0)
        await this.users.logTransaction(
          userId,
          -spent,
          TransactionType.SPEND,
          `Fact-check: ${labelOf(verifier)}`,
        );
      send({
        status: "done",
        result,
        creditBalance: await this.users.getBalance(userId),
      });
    } catch (error) {
      this.logger.error(`Fact-check failed: ${(error as Error).message}`);
      if (cost > 0) await this.users.addCredits(userId, cost);
      send({
        status: "error",
        error: controller.signal.aborted
          ? "The check took too long. Please try again."
          : "The fact-check could not finish. No credits were charged.",
      });
    } finally {
      clearTimeout(timeout);
      this.running.delete(messageId);
      res.end();
    }
  }
}
