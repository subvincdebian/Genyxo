import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatService } from "../chat.service";
import { mapsGeminiDeclarations, mapsPrompt } from "../maps/maps-tools";
import { languageName } from "../language/language";
import {
  LanguageProfileService,
  LanguageSignals,
} from "../language/language-profile.service";

const LIVE_SOCKET =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

/** The one tool a call has: putting a file into the chat instead of reading it out. */
const CREATE_FILE_TOOL = {
  functionDeclarations: [
    {
      name: "create_file",
      description:
        "Put a complete file (code, a document, data or a config) into the chat for the user. Use it whenever the user asks for code or a file.",
      parameters: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            description: "File name with extension, e.g. calc.py",
          },
          language: {
            type: "STRING",
            description: "Programming or markup language, e.g. python",
          },
          content: { type: "STRING", description: "The full file content" },
        },
        required: ["name", "content"],
      },
    },
  ],
};

/** Live's schema dialect spells types in capitals (OBJECT, STRING…). */
function liveSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(liveSchema);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [
      key,
      key === "type" && typeof value === "string"
        ? value.toUpperCase()
        : liveSchema(value),
    ]),
  );
}
const liveDeclarations = (
  declarations: ReturnType<typeof mapsGeminiDeclarations>,
) =>
  declarations.map((declaration) => ({
    ...declaration,
    parameters: liveSchema(declaration.parameters),
  }));

/**
 * Starts Gemini Live voice calls. The browser talks to Gemini directly over a
 * WebSocket for the lowest latency, using a single-use token whose setup
 * (model, voice, instructions, tools) is fixed here, so the API key never
 * leaves the server and the browser cannot change what the call does.
 */
@Injectable()
export class LiveVoiceService {
  private readonly logger = new Logger(LiveVoiceService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly languages: LanguageProfileService,
    private readonly chat: ChatService,
  ) {}

  get model() {
    return this.config.get<string>("VOICE_LIVE_MODEL") || "gemini-3.8-live";
  }

  private async instruction(
    userId: number,
    signals: LanguageSignals,
    conversationId?: number,
  ) {
    const [preferred, history] = await Promise.all([
      this.languages.preferredLanguages(userId, signals).catch(() => []),
      this.chat.voiceContext(userId, conversationId).catch(() => ""),
    ]);
    return [
      "You are Genyxo, the voice of a multi-model AI chat, on a live voice call with the user.",
      "Always reply in the language the user is speaking right now, with natural pronunciation for that language. Never switch languages on your own and never translate the user's words unless asked.",
      preferred.length
        ? `If you cannot tell which language the user speaks, use ${languageName(preferred[0])}. This user usually speaks ${preferred.map(languageName).join(", ")}.`
        : "",
      "Talk like a person on a call: greetings and small talk get one short sentence; other answers stay under about 60 words unless the user asks for detail. No lists, markdown, emoji or links in speech.",
      "When the user asks for code, a document, data or any file, call create_file with the complete content, then say one short sentence that it is in the chat. Never read code aloud or spell it out.",
      history
        ? `The call continues this chat. Conversation so far:\n${history}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async createSession(
    userId: number,
    input: LanguageSignals & {
      voice?: string;
      conversationId?: number;
      location?: { lat: number; lng: number; accuracy?: number };
    },
  ) {
    const key = this.config.get<string>("GOOGLE_API_KEY");
    if (!key || key.startsWith("your_"))
      throw new ServiceUnavailableException(
        "Voice needs a Gemini API key on the server.",
      );
    const now = Date.now();
    const setup = {
      model: `models/${this.model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName:
                input.voice ||
                this.config.get<string>("VOICE_TTS_VOICE") ||
                "Kore",
            },
          },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: [
              await this.instruction(userId, input, input.conversationId),
              input.location
                ? `${mapsPrompt({ origin: input.location })} On a call, say the answer briefly; the map with the places or the route is on the user's screen.`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
      // On the Maps page the call can also search places and plan routes.
      tools: input.location
        ? [
            CREATE_FILE_TOOL,
            {
              functionDeclarations: liveDeclarations(mapsGeminiDeclarations()),
            },
          ]
        : [CREATE_FILE_TOOL],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(now + 30 * 60_000).toISOString(),
          newSessionExpireTime: new Date(now + 60_000).toISOString(),
          bidiGenerateContentSetup: setup,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = (await response.json().catch(() => ({}))) as {
      name?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.name) {
      this.logger.warn(`Live token ${response.status}: ${data.error?.message}`);
      if (response.status === 429)
        throw new HttpException(
          "The live voice service is busy. Try again in a moment.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      throw new BadGatewayException("Could not start a live voice call.");
    }
    return { token: data.name, model: this.model, url: LIVE_SOCKET };
  }
}
