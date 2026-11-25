import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  baseLanguage,
  detectTextLanguage,
  languageName,
} from "../language/language";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
};
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
};

/**
 * Speech for voice conversations through the Gemini API: transcription with
 * language detection, and speech synthesis that works in any language the
 * user spoke. Both use the server's Gemini key, never the browser's.
 */
/** Whisper names languages in English; the app works with codes. */
const WHISPER_LANGUAGES: Record<string, string> = {
  english: "en",
  ukrainian: "uk",
  russian: "ru",
  german: "de",
  french: "fr",
  spanish: "es",
  italian: "it",
  portuguese: "pt",
  polish: "pl",
  czech: "cs",
  slovak: "sk",
  turkish: "tr",
  dutch: "nl",
  swedish: "sv",
  romanian: "ro",
  japanese: "ja",
  korean: "ko",
  chinese: "zh",
  arabic: "ar",
  hindi: "hi",
  indonesian: "id",
  vietnamese: "vi",
  belarusian: "be",
  kazakh: "kk",
  georgian: "ka",
  hebrew: "he",
  greek: "el",
  finnish: "fi",
  danish: "da",
  norwegian: "no",
  hungarian: "hu",
  bulgarian: "bg",
  serbian: "sr",
  croatian: "hr",
};

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(private readonly config: ConfigService) {}

  /** TTS models whose quota ran out, with the time to try them again. */
  private readonly exhausted = new Map<string, number>();

  /** Speech to text on Groq's free Whisper, as {text, language}. */
  private async whisper(audio: string, mimeType: string, language?: string) {
    const key = this.config.get<string>("GROQ_API_KEY");
    if (!key) return null;
    const type = mimeType.split(";")[0] || "audio/webm";
    const extension = type.split("/")[1]?.replace("x-", "") || "webm";
    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from(audio, "base64")], { type }),
      `speech.${extension === "mpeg" ? "mp3" : extension}`,
    );
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    if (language) form.append("language", language);
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) throw new Error(`Whisper ${response.status}`);
    const data = (await response.json()) as {
      text?: string;
      language?: string;
    };
    return {
      text: String(data.text || "").trim(),
      language:
        WHISPER_LANGUAGES[String(data.language || "").toLowerCase()] ||
        language ||
        "",
    };
  }

  private async gemini(model: string, body: unknown): Promise<GeminiResponse> {
    const key = this.config.get<string>("GOOGLE_API_KEY");
    if (!key || key.startsWith("your_"))
      throw new ServiceUnavailableException(
        "Voice needs a Gemini API key on the server.",
      );
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      },
    );
    const data = (await response.json().catch(() => ({}))) as GeminiResponse;
    if (!response.ok) {
      this.logger.warn(
        `Gemini ${model} ${response.status}: ${data.error?.message}`,
      );
      if (response.status === 429)
        throw new HttpException(
          "The voice service is busy. Try again in a moment.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      throw new BadGatewayException(
        "The voice service could not process this request.",
      );
    }
    return data;
  }

  async transcribe(
    audio: string,
    mimeType: string,
    hints: { sessionLanguage?: string; likely?: string[] } = {},
  ) {
    const session = baseLanguage(hints.sessionLanguage);
    const likely = [
      ...new Set([session, ...(hints.likely || [])].filter(Boolean)),
    ];
    const context = [
      session
        ? `This conversation has been in ${languageName(session)} (${session}). Keep that language unless the speaker clearly switched to another one.`
        : "",
      likely.length
        ? `This speaker usually uses, most likely first: ${likely.map((code) => `${languageName(code)} (${code})`).join(", ")}. When the audio could be several related languages, prefer these.`
        : "",
      'Tell close languages apart by their sounds and words: Ukrainian (і, ї, є, ґ, "що", "привіт") is not Russian, Belarusian, Slovak, Polish or Portuguese. Write each language in its own script, Ukrainian and Russian in Cyrillic.',
    ]
      .filter(Boolean)
      .join(" ");
    const model =
      this.config.get<string>("VOICE_TRANSCRIBE_MODEL") ||
      "gemini-3.5-flash-lite";
    // Gemini first (it tells close languages apart best); Groq's Whisper
    // takes over when Gemini's small free speech quota runs out or it fails.
    let raw: string;
    try {
      const data = await this.gemini(model, {
        contents: [
          {
            parts: [
              { inlineData: { mimeType: mimeType.split(";")[0], data: audio } },
              {
                text: `Transcribe the speech exactly, in the language it is spoken (never translate). ${context} Reply with JSON only: {"text": string, "language": BCP-47 code}. If there is no intelligible speech, return {"text": "", "language": ""}.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          temperature: 0,
          // Transcription needs no reasoning; skipping it saves about half a second.
          ...(model.startsWith("gemini-3")
            ? { thinkingConfig: { thinkingLevel: "minimal" } }
            : {}),
        },
      });
      raw =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("") || "{}";
    } catch (error) {
      const whisper = await this.whisper(audio, mimeType, session).catch(
        () => null,
      );
      if (!whisper) throw error;
      this.logger.warn(
        `Transcription moved to Groq Whisper: ${(error as Error)?.message?.slice(0, 120)}`,
      );
      raw = JSON.stringify(whisper);
    }

    try {
      const parsed = JSON.parse(raw) as { text?: unknown; language?: unknown };
      const text =
        typeof parsed.text === "string"
          ? parsed.text.trim().slice(0, 4000)
          : "";
      const reported =
        typeof parsed.language === "string" &&
        /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(parsed.language)
          ? baseLanguage(parsed.language)
          : "";
      // The transcript's own letters outrank the model's label when they
      // clearly disagree (Cyrillic text is never Slovak or Portuguese).
      const written = detectTextLanguage(text);
      const latinOnly = /^[\p{Script=Latin}\P{L}]*$/u.test(text);
      const language =
        written && (!latinOnly || !reported) ? written : reported;
      return { text, language: text ? language || session : "" };
    } catch {
      return { text: "", language: "" };
    }
  }

  /**
   * Speaks text with the chosen voice. Free-tier keys allow only a few TTS
   * requests a day per model, so a model that hits its quota is skipped for
   * an hour and the next one is tried.
   */
  async speak(text: string, language?: string, voice?: string) {
    const configured = this.config.get<string>("VOICE_TTS_MODEL");
    const models = [
      ...new Set(
        [
          configured,
          "gemini-3.8-flash-lite-tts",
          "gemini-3.8-flash-tts",
          "gemini-3.1-flash-tts-preview",
          "gemini-2.5-flash-preview-tts",
        ].filter((model): model is string => Boolean(model)),
      ),
    ].filter((model) => (this.exhausted.get(model) || 0) < Date.now());
    const voiceName =
      voice || this.config.get<string>("VOICE_TTS_VOICE") || "Kore";
    for (const model of models) {
      try {
        const data = await this.gemini(model, {
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              ...(language ? { languageCode: language } : {}),
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        });
        const audio = data.candidates?.[0]?.content?.parts?.find(
          (part) => part.inlineData,
        )?.inlineData;
        if (!audio?.data)
          throw new BadGatewayException("The voice service returned no audio.");
        return { audio: audio.data, mimeType: audio.mimeType };
      } catch (error) {
        if (
          !(error instanceof HttpException) ||
          error.getStatus() !== Number(HttpStatus.TOO_MANY_REQUESTS)
        )
          throw error;
        this.exhausted.set(model, Date.now() + 60 * 60_000);
      }
    }
    throw new HttpException(
      "The voice quota for today is used up.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
