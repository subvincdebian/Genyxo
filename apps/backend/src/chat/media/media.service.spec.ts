import { ConfigService } from "@nestjs/config";
import { memoryRepository } from "../../integrations/memory-repository.test-spec";
import { describeMediaFences, mediaTools, runMediaTool } from "./media-tools";
import { MEDIA_COSTS, MediaService } from "./media.service";

const PNG = Buffer.from("png-bytes");

function setup(
  env: Record<string, string> = { GOOGLE_API_KEY: "g", FAL_KEY: "f" },
  balance = 1000,
) {
  const config = {
    get: (name: string) => env[name],
  } as unknown as ConfigService;
  const repo = memoryRepository<any>();
  const users = {
    getBalance: jest.fn(async () => balance),
    deductCredits: jest.fn(async () => true),
    addCredits: jest.fn(),
    logTransaction: jest.fn(),
  };
  const voice = {
    speak: jest.fn(async () => ({
      audio: Buffer.from([1, 0, 2, 0]).toString("base64"),
      mimeType: "audio/L16;codec=pcm;rate=24000",
    })),
  };
  const service = new MediaService(
    config,
    repo as any,
    users as any,
    voice as any,
  );
  return { service, repo, users, voice };
}

function mockFetch(handler: (url: string, init: RequestInit) => Response) {
  return jest
    .spyOn(global, "fetch")
    .mockImplementation(async (input: any, init: any = {}) =>
      handler(String(input), init),
    );
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("MediaService", () => {
  afterEach(() => jest.restoreAllMocks());

  it("makes images with Gemini and charges credits", async () => {
    const { service, users } = setup();
    mockFetch((url) => {
      expect(url).toContain("gemini-3.1-flash-image:generateContent");
      return json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: PNG.toString("base64"),
                  },
                },
              ],
            },
          },
        ],
      });
    });
    const record = await service.image({ userId: 1, prompt: "a cat" });
    expect(record).toMatchObject({
      kind: "image",
      status: "ready",
      provider: "gemini-3.1-flash-image",
      mimeType: "image/png",
      cost: MEDIA_COSTS.image,
    });
    expect(users.deductCredits).toHaveBeenCalledWith(1, MEDIA_COSTS.image);
    expect((await service.file(record.id)).data.equals(PNG)).toBe(true);
  });

  it("falls back to the same Google model on fal.ai when the Gemini key has no quota", async () => {
    const { service } = setup();
    const calls: string[] = [];
    mockFetch((url, init) => {
      calls.push(url);
      if (url.includes("generativelanguage"))
        return json({ error: { message: "quota" } }, 429);
      if (url === "https://fal.run/fal-ai/nano-banana/edit") {
        expect(JSON.parse(init.body as string).image_urls[0]).toMatch(
          /^data:image\/jpeg;base64,/,
        );
        return json({
          images: [{ url: "https://v3.fal.media/files/out.png" }],
        });
      }
      return new Response(PNG, { headers: { "Content-Type": "image/png" } });
    });
    const record = await service.image({
      userId: 1,
      prompt: "make it blue",
      images: [{ mimeType: "image/jpeg", data: "abc" }],
    });
    expect(record.provider).toBe("fal-ai/nano-banana/edit");
    expect(calls[2]).toBe("https://v3.fal.media/files/out.png");
  });

  it("refuses before generating when the user lacks credits", async () => {
    const { service, users } = setup(undefined, 10);
    const fetchMock = mockFetch(() => json({}));
    await expect(service.image({ userId: 1, prompt: "x" })).rejects.toThrow(
      "Not enough credits",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(users.deductCredits).not.toHaveBeenCalled();
  });

  it("wraps raw PCM speech in a WAV file and keeps speech free", async () => {
    const { service, users } = setup();
    const record = await service.speech({ userId: 1, prompt: "Hello" });
    expect(record.mimeType).toBe("audio/wav");
    expect(record.data!.subarray(0, 4).toString()).toBe("RIFF");
    expect(users.deductCredits).not.toHaveBeenCalled();
  });

  it("reports which kinds this server can make", () => {
    expect(setup({ GOOGLE_API_KEY: "g" }).service.available()).toEqual({
      image: true,
      video: false,
      music: true,
      speech: true,
    });
    expect(setup({}).service.available()).toEqual({
      image: false,
      video: false,
      music: false,
      speech: false,
    });
    expect(
      mediaTools(setup({ GOOGLE_API_KEY: "g" }).service).map(
        (tool) => tool.name,
      ),
    ).toEqual([
      "genyxo_generate_image",
      "genyxo_generate_speech",
      "genyxo_generate_music",
    ]);
  });

  it("starts video in the background and refunds a failed job", async () => {
    jest.useFakeTimers();
    try {
      const { service, users, repo } = setup();
      mockFetch((url) => {
        if (url === "https://queue.fal.run/fal-ai/veo3.1/fast")
          return json({
            request_id: "job-1",
            status_url: "https://queue.fal.run/s",
            response_url: "https://queue.fal.run/r",
          });
        return json({ status: "FAILED", error: "blocked" });
      });
      const record = await service.video({ userId: 1, prompt: "waves" });
      expect(record).toMatchObject({
        status: "pending",
        jobId: "job-1",
        cost: MEDIA_COSTS.video,
      });
      expect(users.deductCredits).toHaveBeenCalledWith(1, MEDIA_COSTS.video);
      await jest.advanceTimersByTimeAsync(9_000);
      expect(repo.rows[0]).toMatchObject({
        status: "failed",
        error: "blocked",
      });
      expect(users.addCredits).toHaveBeenCalledWith(1, MEDIA_COSTS.video);
      service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("media chat tools", () => {
  afterEach(() => jest.restoreAllMocks());

  it("shows images inline and audio/video as a player card, and tells the model not to repeat it", async () => {
    const service = {
      image: jest.fn(async () => ({
        id: "11111111-1111-4111-8111-111111111111",
        kind: "image",
        status: "ready",
        cost: 40,
      })),
      speech: jest.fn(async () => ({
        id: "22222222-2222-4222-8222-222222222222",
        kind: "speech",
        status: "ready",
        cost: 0,
      })),
    } as any;
    const image = await runMediaTool(
      service,
      "genyxo_generate_image",
      { prompt: "a [red] cat\n(anime)", useAttachedImages: true },
      { userId: 1, images: [{ mimeType: "image/png", data: "x" }] },
    );
    expect(image.markdown).toBe(
      "\n\n![a red cat anime](/api/chat/media/11111111-1111-4111-8111-111111111111)\n\n",
    );
    expect(service.image.mock.calls[0][0].images).toHaveLength(1);
    expect(image.output).toMatchObject({ status: "done", credits: 40 });
    const speech = await runMediaTool(
      service,
      "genyxo_generate_speech",
      { text: "Hi" },
      { userId: 1 },
    );
    expect(speech.markdown).toContain("```genyxo-media");
    expect(describeMediaFences(`Here.${speech.markdown}`)).toBe(
      "Here.\n\n[Generated speech: Hi]\n\n",
    );
    expect(
      (await runMediaTool(service, "genyxo_generate_image", {}, { userId: 1 }))
        .output.error,
    ).toContain("prompt");
  });
});
