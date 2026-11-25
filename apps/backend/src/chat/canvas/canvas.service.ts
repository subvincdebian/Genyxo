import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ServerResponse } from "http";
import { ChatService } from "../chat.service";
import { PricingService, ModelType } from "../pricing.service";
import { SandboxService } from "../sandbox/sandbox.service";
import { UsersService } from "../../users/users.service";
import { TransactionType } from "../../transactions/transaction.entity";
import { EXPORT_SCRIPT } from "./export-script";

export interface CanvasEditInput {
  content: string;
  language: string;
  instruction: string;
  selection?: { start: number; end: number };
  model?: string;
}

const FALLBACKS = [
  "google/gemini-3.5-flash",
  "google/gemini-3.5-flash-lite",
  "google/gemini-2.5-flash",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
];

const MIME: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** A model's reply without the code fence it sometimes wraps around the text. */
export function stripFence(text: string) {
  const match = /^\s*```[\w+-]*\n([\s\S]*?)\n?```\s*$/.exec(text);
  return match ? match[1] : text;
}

/** The instruction for a canvas edit: a selection or the whole document. */
export function editPrompt(input: CanvasEditInput) {
  const markdown = input.language === "markdown";
  const kind = markdown ? "Markdown document" : `${input.language} file`;
  const rules = [
    "Output only the new text: no explanations, no quotes around it, no code fences.",
    markdown
      ? "Keep Markdown formatting and the document's language unless the instruction asks to translate."
      : "Keep the code's language, style and indentation. Keep it valid and complete.",
  ];
  if (input.selection) {
    const { start, end } = input.selection;
    return {
      system: [
        `You are an editor inside a canvas with a ${kind}. Rewrite only the SELECTION as the instruction says; the text around it stays as it is.`,
        "The replacement must fit seamlessly between the text before and after it.",
        ...rules,
      ].join("\n"),
      prompt: `INSTRUCTION: ${input.instruction}\n\nTEXT BEFORE (unchanged):\n${input.content.slice(Math.max(0, start - 3000), start)}\n\nSELECTION (rewrite this):\n${input.content.slice(start, end)}\n\nTEXT AFTER (unchanged):\n${input.content.slice(end, end + 2000)}`,
    };
  }
  return {
    system: [
      `You are an editor inside a canvas with a ${kind}. Apply the instruction to the document and return the complete updated document.`,
      "Change only what the instruction asks for; keep everything else as it is.",
      ...rules,
    ].join("\n"),
    prompt: `INSTRUCTION: ${input.instruction}\n\nDOCUMENT:\n${input.content}`,
  };
}

/**
 * The canvas's AI features: rewriting a selection or the whole document as a
 * stream, and exporting a document to Word, PDF or PowerPoint in the sandbox.
 */
@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    private readonly chat: ChatService,
    private readonly pricing: PricingService,
    private readonly users: UsersService,
    private readonly sandbox: SandboxService,
  ) {}

  private pickModel(requested?: string) {
    const config = requested
      ? this.pricing.getModelConfig(requested)
      : undefined;
    return config?.type === ModelType.TEXT &&
      !/embedding|robotics|audio|live-translate/.test(requested!)
      ? requested!
      : FALLBACKS[0];
  }

  async edit(userId: number, input: CanvasEditInput, res: ServerResponse) {
    if (input.content.length > 200_000)
      throw new BadRequestException(
        "This document is too long to edit with AI",
      );
    if (input.selection) {
      const { start, end } = input.selection;
      if (start < 0 || end > input.content.length || end <= start)
        throw new BadRequestException(
          "The selection is out of date. Select the text again.",
        );
    } else if (input.content.length > 60_000)
      throw new BadRequestException(
        "Select the part to edit: the whole document is too long for one edit.",
      );
    const model = this.pickModel(input.model);
    const cost = this.pricing.getCost(model);
    if (cost > 0 && !(await this.users.deductCredits(userId, cost)))
      throw new ForbiddenException("Not enough credits");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const send = (event: object) => {
      if (!res.destroyed && res.writable !== false)
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const { system, prompt } = editPrompt(input);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    res.on("close", () => controller.abort());
    let text = "";
    let used = model;
    try {
      // Before the first word arrives, a busy model hands over to the next one.
      for (const candidate of [
        model,
        ...FALLBACKS.filter((item) => item !== model),
      ]) {
        used = candidate;
        try {
          await this.chat.streamText(
            candidate,
            system,
            prompt,
            async (token) => {
              text += token;
              send({ token });
              return !controller.signal.aborted;
            },
            controller.signal,
          );
          break;
        } catch (error) {
          if (text || controller.signal.aborted) throw error;
          this.logger.warn(
            `Canvas edit with ${candidate} failed: ${(error as Error).message}`,
          );
        }
      }
      if (!text.trim()) throw new Error("The model returned nothing");
      const spent = Math.min(cost, this.pricing.getCost(used));
      if (cost > spent) await this.users.addCredits(userId, cost - spent);
      if (spent > 0)
        await this.users.logTransaction(
          userId,
          -spent,
          TransactionType.SPEND,
          `Canvas edit: ${used}`,
        );
      send({
        done: true,
        text: stripFence(text),
        model: used,
        creditBalance: await this.users.getBalance(userId),
      });
    } catch (error) {
      if (cost > 0) await this.users.addCredits(userId, cost);
      send({
        error: controller.signal.aborted
          ? "The edit was stopped."
          : "The edit could not be finished. Nothing was charged.",
      });
      this.logger.warn(`Canvas edit failed: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
      res.end();
    }
  }

  async export(input: {
    format: string;
    title: string;
    content: string;
    language: string;
  }) {
    if (!["docx", "pdf", "pptx"].includes(input.format))
      throw new BadRequestException("Export as docx, pdf or pptx");
    if (!this.sandbox.available)
      throw new ServiceUnavailableException(
        "Export is not available on this server",
      );
    const kind = input.language === "markdown" ? "markdown" : "code";
    if (input.format === "pptx" && kind !== "markdown")
      throw new BadRequestException(
        "Slides can be made from documents, not code",
      );
    const result = await this.sandbox.run(
      EXPORT_SCRIPT,
      [
        {
          name: "meta.json",
          data: Buffer.from(
            JSON.stringify({
              format: input.format,
              title: input.title.slice(0, 120),
              kind,
            }),
          ).toString("base64"),
        },
        {
          name: "doc.txt",
          data: Buffer.from(input.content).toString("base64"),
        },
      ],
      90,
    );
    const file = result.files[0];
    if (!result.ok || !file) {
      this.logger.warn(
        `Canvas export failed: ${result.error} ${result.stderr.slice(-500)}`,
      );
      throw new BadRequestException("The document could not be exported");
    }
    return {
      name: file.name,
      mime: MIME[input.format],
      data: Buffer.from(file.data, "base64"),
    };
  }
}
