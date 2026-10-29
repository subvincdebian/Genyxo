import { ConfigService } from "@nestjs/config";
import { LiveVoiceService } from "./live.service";
import { ChatService } from "../chat.service";
import { LanguageProfileService } from "../language/language-profile.service";

describe("voice call language setup", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it("fixes the selected language in the single-use token before microphone input", async () => {
    const fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: "test-single-use-token" }),
    });
    global.fetch = fetch;
    const service = new LiveVoiceService(
      {
        get: (key: string) =>
          key === "GOOGLE_API_KEY" ? "test-key" : undefined,
      } as ConfigService,
      {
        preferredLanguages: async () => ["en"],
      } as unknown as LanguageProfileService,
      { voiceContext: async () => "" } as unknown as ChatService,
    );
    await service.createSession(1, { voice: "Aoede", callLanguage: "uk" });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    const instruction =
      body.bidiGenerateContentSetup.systemInstruction.parts[0].text;
    expect(instruction).toContain("Ukrainian");
    expect(instruction).toContain("from your very first response");
    expect(instruction).not.toContain(
      "Always reply in the language the user is speaking right now",
    );
    expect(
      body.bidiGenerateContentSetup.generationConfig.speechConfig.voiceConfig
        .prebuiltVoiceConfig.voiceName,
    ).toBe("Aoede");
    expect(body.uses).toBe(1);
  });
});
