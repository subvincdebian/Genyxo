import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { TransactionType } from "../../transactions/transaction.entity";
import { UsersService } from "../../users/users.service";
import { VoiceService } from "../voice/voice.service";
import { GeneratedMedia, MediaKind } from "./generated-media.entity";

/** Genyxo credits charged per successful generation. */
export const MEDIA_COSTS: Record<MediaKind, number> = {
  image: 40,
  video: 400,
  music: 60,
  speech: 0,
};
const VIDEO_POLL_MS = 8_000;
const VIDEO_DEADLINE_MS = 12 * 60_000;
const MAX_STORED_BYTES = 60 * 1024 * 1024;

export interface MediaRequest {
  userId: number;
  conversationId?: number;
  prompt: string;
  aspectRatio?: string;
  /** Images the user attached, used as references or for editing. */
  images?: { mimeType: string; data: string }[];
  voice?: string;
  language?: string;
  /** A specific image model the user picked, e.g. "cf/black-forest-labs/flux-2-dev". */
  model?: string;
}

class ProviderUnavailable extends Error {}

/**
 * Free image models on Cloudflare Workers AI, best first. They run on the
 * account's free daily allowance, so users pay nothing for them.
 */
export const CLOUDFLARE_IMAGE_MODELS = [
  "cf/black-forest-labs/flux-2-dev",
  "cf/leonardo/lucid-origin",
  "cf/black-forest-labs/flux-2-klein-9b",
  "cf/leonardo/phoenix-1.0",
  "cf/black-forest-labs/flux-2-klein-4b",
  "cf/black-forest-labs/flux-1-schnell",
];
const ASPECT_SIZES: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "16:9": [1344, 768],
  "9:16": [768, 1344],
  "4:3": [1152, 864],
  "3:4": [864, 1152],
};

/** Wraps raw 16-bit PCM (as some Gemini TTS models return it) in a WAV header. */
function pcmToWav(pcm: Buffer, rate: number) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Generates images, video, speech and music for chat models. Each kind tries
 * Google's Gemini API first and falls back to the same Google models hosted
 * on fal.ai when the Gemini key has no quota for them (free-tier keys allow
 * speech only).
 */
@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaService.name);
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GeneratedMedia)
    private readonly media: Repository<GeneratedMedia>,
    private readonly users: UsersService,
    @Optional() private readonly voice?: VoiceService,
  ) {}

  /** Video jobs are watched in memory; ones a restart orphaned are refunded. */
  async onModuleInit() {
    try {
      const orphaned = await this.media.find({ where: { status: "pending" } });
      for (const record of orphaned)
        await this.fail(
          record.id,
          "The server restarted before the video finished",
        );
    } catch (error: any) {
      this.logger.warn(`Could not check pending media: ${error?.message}`);
    }
  }

  onModuleDestroy() {
    for (const timer of this.timers) clearTimeout(timer);
  }

  private env(name: string) {
    const value = this.config.get<string>(name)?.trim();
    return value && !value.startsWith("your_") ? value : "";
  }
  private get geminiKey() {
    return this.env("GOOGLE_API_KEY") || this.env("GEMINI_API_KEY");
  }
  private get falKey() {
    return this.env("FAL_KEY");
  }
  private get cloudflare() {
    const key =
      this.env("CLOUDFLARE_WORKERS_API_KEY") ||
      this.env("CLOUDFARE_WORKERS_API_KEY") ||
      this.env("CLOUDFLARE_API_TOKEN");
    const account =
      this.env("CLOUDFLARE_ACCOUNT_ID") ||
      this.env("CLOUDFLARE_WORKERS_ACCOUNT_ID") ||
      this.env("CLOUDFARE_WORKERS_ACCOUNT_ID");
    return key && account ? { key, account } : null;
  }

  /** Which kinds this server can generate at all. */
  available(): Record<MediaKind, boolean> {
    const gemini = Boolean(this.geminiKey);
    const fal = Boolean(this.falKey);
    return {
      image: gemini || fal || Boolean(this.cloudflare),
      video: fal,
      music: gemini || fal,
      speech: gemini,
    };
  }

  // ---------- Providers ----------

  private async gemini(model: string, body: unknown) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.geminiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      },
    );
    const data = await response.json().catch(() => ({}));
    // No quota, no access or no such model on this key: let the fallback try.
    if ([403, 404, 429].includes(response.status))
      throw new ProviderUnavailable(`${model}: ${response.status}`);
    if (!response.ok)
      throw new Error(
        String(data?.error?.message || `Gemini error ${response.status}`).slice(
          0,
          200,
        ),
      );
    const parts = (data.candidates?.[0]?.content?.parts || []) as any[];
    const inline = parts.find((part) => part.inlineData?.data)?.inlineData;
    if (!inline) {
      const reason =
        parts.find((part) => part.text)?.text ||
        data.candidates?.[0]?.finishReason ||
        "no media";
      throw new Error(
        `The model returned no media (${String(reason).slice(0, 160)})`,
      );
    }
    return {
      bytes: Buffer.from(inline.data, "base64"),
      mimeType: String(inline.mimeType || "application/octet-stream"),
    };
  }

  /** One image from a Cloudflare Workers AI model; each family takes its own input. */
  private async cloudflareImage(model: string, prompt: string, aspect: string) {
    const cf = this.cloudflare;
    if (!cf) throw new ProviderUnavailable("Cloudflare is not configured");
    const id = `@cf/${model.replace(/^cf\//, "")}`;
    const [width, height] = ASPECT_SIZES[aspect] || ASPECT_SIZES["1:1"];
    const url = `https://api.cloudflare.com/client/v4/accounts/${cf.account}/ai/run/${id}`;
    const headers = { Authorization: `Bearer ${cf.key}` };
    let response: Response;
    if (id.includes("flux-2")) {
      // FLUX.2 takes a multipart form.
      const form = new FormData();
      form.append("prompt", prompt.slice(0, 2000));
      form.append("width", String(width));
      form.append("height", String(height));
      response = await fetch(url, {
        method: "POST",
        headers,
        body: form,
        signal: AbortSignal.timeout(120_000),
      });
    } else {
      const body = id.includes("flux-1-schnell")
        ? { prompt: prompt.slice(0, 2000), steps: 8 }
        : { prompt: prompt.slice(0, 2000), width, height };
      response = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    }
    // Out of the daily allowance, rate limited or not on this plan: next model.
    if (
      [402, 403, 404, 429].includes(response.status) ||
      response.status >= 500
    )
      throw new ProviderUnavailable(`${id}: ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("json")) {
      if (!response.ok)
        throw new Error(`Cloudflare image error ${response.status}`);
      return {
        bytes: Buffer.from(await response.arrayBuffer()),
        mimeType: type.split(";")[0] || "image/png",
      };
    }
    const data = (await response.json().catch(() => ({}))) as {
      result?: { image?: string };
      errors?: { message?: string }[];
    };
    if (!response.ok || !data.result?.image)
      throw new Error(
        String(
          data.errors?.[0]?.message ||
            `Cloudflare image error ${response.status}`,
        ).slice(0, 200),
      );
    const bytes = Buffer.from(data.result.image, "base64");
    // PNG starts with 0x89, JPEG with 0xFF.
    return { bytes, mimeType: bytes[0] === 0xff ? "image/jpeg" : "image/png" };
  }

  private async fal(model: string, input: Record<string, unknown>) {
    const response = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${this.falKey}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(180_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        String(
          data?.detail?.[0]?.msg ||
            data?.detail ||
            data?.message ||
            `fal.ai error ${response.status}`,
        ).slice(0, 200),
      );
    return data;
  }

  private async download(url: string) {
    if (!/^https:\/\//.test(url))
      throw new Error("The provider returned no file");
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok)
      throw new Error(
        `Could not fetch the generated file (${response.status})`,
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_STORED_BYTES)
      throw new Error("The generated file is too large to store");
    return {
      bytes,
      mimeType:
        response.headers.get("content-type")?.split(";")[0] ||
        "application/octet-stream",
    };
  }

  /** Tries each provider in order; only "no quota/no access" moves on to the next. */
  private async firstAvailable(
    attempts: {
      provider: string;
      run: () => Promise<{ bytes: Buffer; mimeType: string }>;
    }[],
  ) {
    let last: Error | null = null;
    for (const attempt of attempts) {
      try {
        return { ...(await attempt.run()), provider: attempt.provider };
      } catch (error) {
        last = error as Error;
        if (!(error instanceof ProviderUnavailable)) throw error;
        this.logger.warn(
          `${attempt.provider} unavailable, trying the next provider`,
        );
      }
    }
    throw new Error(
      last instanceof ProviderUnavailable
        ? "No configured provider has quota for this right now"
        : last?.message || "Generation failed",
    );
  }

  // ---------- Credits and storage ----------

  private async ensureCredits(userId: number, kind: MediaKind) {
    const cost = MEDIA_COSTS[kind];
    if (cost > 0 && (await this.users.getBalance(userId)) < cost)
      throw new Error(`Not enough credits: this ${kind} costs ${cost} credits`);
    return cost;
  }
  private async charge(
    userId: number,
    kind: MediaKind,
    cost: number,
    provider: string,
  ) {
    if (cost <= 0) return;
    if (!(await this.users.deductCredits(userId, cost)))
      throw new Error(`Not enough credits: this ${kind} costs ${cost} credits`);
    await this.users.logTransaction(
      userId,
      -cost,
      TransactionType.SPEND,
      `AI ${kind}: ${provider}`,
    );
  }

  private async save(
    request: MediaRequest,
    kind: MediaKind,
    fields: Partial<GeneratedMedia>,
  ) {
    return this.media.save(
      this.media.create({
        id: randomUUID(),
        userId: request.userId,
        conversationId: request.conversationId ?? null,
        kind,
        prompt: request.prompt.slice(0, 4000),
        status: "ready",
        jobId: null,
        error: null,
        ...fields,
      } as GeneratedMedia),
    );
  }

  // ---------- Kinds ----------

  async image(request: MediaRequest) {
    const aspect = request.aspectRatio || "1:1";
    const references = (request.images || []).slice(0, 3);
    // New pictures come from Cloudflare's free models, the picked one first;
    // editing attached images needs Gemini or fal, which cost credits.
    const freeModels =
      this.cloudflare && !references.length
        ? [
            ...(request.model?.startsWith("cf/") ? [request.model] : []),
            ...CLOUDFLARE_IMAGE_MODELS.filter(
              (model) => model !== request.model,
            ),
          ]
        : [];
    const free = freeModels.map((model) => ({
      provider: model,
      run: () => this.cloudflareImage(model, request.prompt, aspect),
    }));
    const cost = free.length
      ? 0
      : await this.ensureCredits(request.userId, "image");
    const geminiModel =
      this.env("MEDIA_IMAGE_MODEL") || "gemini-3.1-flash-image";
    const result = await this.firstAvailable([
      ...free,
      ...(this.geminiKey
        ? [
            {
              provider: geminiModel,
              run: () =>
                this.gemini(geminiModel, {
                  contents: [
                    {
                      parts: [
                        { text: request.prompt },
                        ...references.map((image) => ({ inlineData: image })),
                      ],
                    },
                  ],
                  generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                    imageConfig: { aspectRatio: aspect },
                  },
                }),
            },
          ]
        : []),
      ...(this.falKey
        ? [
            {
              provider: references.length
                ? "fal-ai/nano-banana/edit"
                : "fal-ai/nano-banana",
              run: async () => {
                const output = await this.fal(
                  references.length
                    ? "fal-ai/nano-banana/edit"
                    : "fal-ai/nano-banana",
                  {
                    prompt: request.prompt,
                    num_images: 1,
                    aspect_ratio: aspect,
                    output_format: "png",
                    ...(references.length
                      ? {
                          image_urls: references.map(
                            (image) =>
                              `data:${image.mimeType};base64,${image.data}`,
                          ),
                        }
                      : {}),
                  },
                );
                return this.download(output.images?.[0]?.url);
              },
            },
          ]
        : []),
    ]);
    // Free Cloudflare models cost nothing; a paid fallback is charged as usual.
    const paid = result.provider.startsWith("cf/")
      ? 0
      : cost || MEDIA_COSTS.image;
    await this.charge(request.userId, "image", paid, result.provider);
    return this.save(request, "image", {
      provider: result.provider,
      mimeType: result.mimeType,
      data: result.bytes,
      cost: paid,
    });
  }

  async speech(request: MediaRequest) {
    if (!this.voice) throw new Error("Speech is not available on this server");
    const spoken = await this.voice.speak(
      request.prompt.slice(0, 5000),
      request.language,
      request.voice,
    );
    let bytes = Buffer.from(spoken.audio, "base64");
    let mimeType = spoken.mimeType;
    if (/l16|pcm/i.test(mimeType)) {
      bytes = pcmToWav(
        bytes,
        Number(mimeType.match(/rate=(\d+)/)?.[1] || 24000),
      );
      mimeType = "audio/wav";
    }
    return this.save(request, "speech", {
      provider: "gemini-tts",
      mimeType,
      data: bytes,
      cost: 0,
    });
  }

  async music(request: MediaRequest) {
    const cost = await this.ensureCredits(request.userId, "music");
    const geminiModel = this.env("MEDIA_MUSIC_MODEL") || "lyria-3-clip-preview";
    const result = await this.firstAvailable([
      ...(this.geminiKey
        ? [
            {
              provider: geminiModel,
              run: () =>
                this.gemini(geminiModel, {
                  contents: [{ parts: [{ text: request.prompt }] }],
                }),
            },
          ]
        : []),
      ...(this.falKey
        ? [
            {
              provider: "fal-ai/lyria2",
              run: async () =>
                this.download(
                  (await this.fal("fal-ai/lyria2", { prompt: request.prompt }))
                    .audio?.url,
                ),
            },
          ]
        : []),
    ]);
    await this.charge(request.userId, "music", cost, result.provider);
    return this.save(request, "music", {
      provider: result.provider,
      mimeType: result.mimeType,
      data: result.bytes,
      cost,
    });
  }

  /** Starts a video job; it finishes in the background and the chat card polls it. */
  async video(request: MediaRequest) {
    if (!this.falKey)
      throw new Error(
        "Video generation is not configured on this server (FAL_KEY)",
      );
    const cost = await this.ensureCredits(request.userId, "video");
    const model = this.env("MEDIA_VIDEO_MODEL") || "fal-ai/veo3.1/fast";
    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${this.falKey}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        aspect_ratio: request.aspectRatio === "9:16" ? "9:16" : "16:9",
        duration: "8s",
        generate_audio: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const job = await response.json().catch(() => ({}));
    if (!response.ok || !job.request_id)
      throw new Error(
        String(job?.detail || `fal.ai error ${response.status}`).slice(0, 200),
      );
    // Charged when the job is accepted; a failed job is refunded.
    await this.charge(request.userId, "video", cost, model);
    const record = await this.save(request, "video", {
      provider: model,
      status: "pending",
      jobId: String(job.request_id),
      mimeType: "video/mp4",
      cost,
    });
    this.watchVideo(
      record.id,
      model,
      String(job.status_url || ""),
      String(job.response_url || ""),
      Date.now() + VIDEO_DEADLINE_MS,
    );
    return record;
  }

  private watchVideo(
    id: string,
    model: string,
    statusUrl: string,
    responseUrl: string,
    deadline: number,
  ) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      void this.pollVideo(id, model, statusUrl, responseUrl, deadline);
    }, VIDEO_POLL_MS);
    this.timers.add(timer);
  }

  private async pollVideo(
    id: string,
    model: string,
    statusUrl: string,
    responseUrl: string,
    deadline: number,
  ) {
    try {
      const headers = { Authorization: `Key ${this.falKey}` };
      const status = await (
        await fetch(statusUrl, {
          headers,
          signal: AbortSignal.timeout(20_000),
        })
      ).json();
      if (status.status === "COMPLETED") {
        const result = await (
          await fetch(responseUrl, {
            headers,
            signal: AbortSignal.timeout(30_000),
          })
        ).json();
        const file = await this.download(result.video?.url);
        await this.media.update(
          { id },
          {
            status: "ready",
            data: file.bytes,
            mimeType: file.mimeType || "video/mp4",
          },
        );
        return;
      }
      if (Date.now() > deadline || ["FAILED", "ERROR"].includes(status.status))
        throw new Error(status.error || "The video job did not finish");
      this.watchVideo(id, model, statusUrl, responseUrl, deadline);
    } catch (error: any) {
      await this.fail(id, error?.message || "Video generation failed");
    }
  }

  private async fail(id: string, message: string) {
    const record = await this.media.findOne({ where: { id } });
    if (!record || record.status !== "pending") return;
    await this.media.update(
      { id },
      { status: "failed", error: message.slice(0, 300) },
    );
    if (record.cost > 0) {
      await this.users.addCredits(record.userId, record.cost);
      await this.users.logTransaction(
        record.userId,
        record.cost,
        TransactionType.REFUND,
        `AI ${record.kind} refund`,
      );
    }
  }

  // ---------- Reading ----------

  async status(id: string) {
    const record = await this.media.findOne({ where: { id } });
    if (!record) throw new NotFoundException("Media not found");
    return {
      id: record.id,
      kind: record.kind,
      status: record.status,
      mimeType: record.mimeType,
      error: record.error,
    };
  }

  /** Stores a file a tool produced (code sandbox output) for download. */
  async saveFile(
    userId: number,
    conversationId: number | null,
    name: string,
    mimeType: string,
    data: Buffer,
  ) {
    const image = /^image\/(png|jpeg|webp|gif)$/.test(mimeType);
    const record = await this.media.save(
      this.media.create({
        id: randomUUID(),
        userId,
        conversationId,
        kind: image ? "image" : "file",
        prompt: name.slice(0, 200),
        provider: "sandbox",
        status: "ready",
        mimeType: mimeType.slice(0, 80),
        fileName: name.slice(0, 200),
        data,
        jobId: null,
        error: null,
      } as GeneratedMedia),
    );
    return { id: record.id, url: `/api/chat/media/${record.id}` };
  }

  async file(id: string) {
    const record = await this.media.findOne({
      where: { id },
      select: {
        id: true,
        status: true,
        mimeType: true,
        data: true,
        fileName: true,
      },
    });
    if (!record || record.status !== "ready" || !record.data)
      throw new NotFoundException("Media not found");
    return {
      data: record.data,
      mimeType: record.mimeType || "application/octet-stream",
      fileName: record.fileName,
    };
  }
}
