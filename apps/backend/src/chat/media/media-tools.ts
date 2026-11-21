import type { MediaKind } from "./generated-media.entity";
import { MEDIA_COSTS, MediaRequest, MediaService } from "./media.service";

/**
 * Built-in creative tools every chat model gets, whatever its own modalities:
 * the model writes the prompt, Genyxo's media models produce the file, and the
 * reply shows it inline.
 */
interface MediaTool {
  name: string;
  kind: MediaKind;
  label: string;
  description: string;
  parameters: Record<string, any>;
}

const aspect = {
  type: "string",
  enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  description: "Aspect ratio",
};
const TOOLS: MediaTool[] = [
  {
    name: "genyxo_generate_image",
    kind: "image",
    label: "Generating image",
    description: `Create or edit an image from a detailed English prompt (subject, style, composition, lighting). Set useAttachedImages to edit or reference images the user attached. Costs ${MEDIA_COSTS.image} credits.`,
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed image prompt" },
        aspectRatio: aspect,
        useAttachedImages: {
          type: "boolean",
          description: "Use the user's attached images as the input",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "genyxo_generate_video",
    kind: "video",
    label: "Generating video",
    description: `Create an 8-second video with sound from a detailed English prompt (scene, motion, camera, style). It finishes in the background in 1–3 minutes. Costs ${MEDIA_COSTS.video} credits.`,
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed video prompt" },
        aspectRatio: {
          type: "string",
          enum: ["16:9", "9:16"],
          description: "Aspect ratio",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "genyxo_generate_speech",
    kind: "speech",
    label: "Generating speech",
    description:
      "Read text aloud as a natural voice-over audio file, in any language. Put delivery directions at the start, e.g. 'Say warmly: …'. Free.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "What to say, with optional delivery direction",
        },
        voice: {
          type: "string",
          description:
            "Gemini voice name, e.g. Kore, Puck, Charon, Aoede (default Kore)",
        },
        language: { type: "string", description: "BCP-47 code, e.g. uk-UA" },
      },
      required: ["text"],
    },
  },
  {
    name: "genyxo_generate_music",
    kind: "music",
    label: "Generating music",
    description: `Compose a short instrumental music clip from an English description (genre, mood, instruments, tempo). Costs ${MEDIA_COSTS.music} credits.`,
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Music description" },
      },
      required: ["prompt"],
    },
  },
];

export const isMediaTool = (name: string) =>
  TOOLS.some((tool) => tool.name === name);

export function mediaTools(service: MediaService) {
  const available = service.available();
  return TOOLS.filter((tool) => available[tool.kind]);
}

export function mediaGeminiDeclarations(tools: MediaTool[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
export function mediaOpenAiTools(tools: MediaTool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
export const mediaActivity = (name: string) =>
  TOOLS.find((tool) => tool.name === name)?.label || "Generating media";

export const MEDIA_PROMPT =
  "You can create media with built-in tools: images (genyxo_generate_image, also edits attached images), video, speech and music where offered. When the user asks for a picture, drawing, photo, illustration, logo, video, voice-over or song, call the tool instead of saying you cannot, and write a rich English prompt. The file appears in the chat automatically: do not paste links or markdown for it; add at most one short sentence.";

const clean = (text: string) =>
  text
    .replace(/[[\]()\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

/** Runs a media tool and returns what the model reads plus what the user sees. */
export async function runMediaTool(
  service: MediaService,
  name: string,
  args: Record<string, any>,
  request: Omit<MediaRequest, "prompt">,
) {
  const tool = TOOLS.find((item) => item.name === name);
  if (!tool) return { output: { error: "Unknown media tool" } };
  const prompt = String(args.prompt || args.text || "").trim();
  if (!prompt)
    return { output: { error: "Invalid arguments: prompt is required" } };
  const base: MediaRequest = {
    ...request,
    prompt,
    aspectRatio:
      typeof args.aspectRatio === "string" ? args.aspectRatio : undefined,
    voice: typeof args.voice === "string" ? args.voice : undefined,
    language:
      typeof args.language === "string" ? args.language : request.language,
    images: args.useAttachedImages ? request.images : undefined,
  };
  try {
    const record =
      tool.kind === "image"
        ? await service.image(base)
        : tool.kind === "video"
          ? await service.video(base)
          : tool.kind === "speech"
            ? await service.speech(base)
            : await service.music(base);
    const markdown =
      tool.kind === "image"
        ? `\n\n![${clean(prompt)}](/api/chat/media/${record.id})\n\n`
        : `\n\n\`\`\`genyxo-media\n${JSON.stringify({ id: record.id, kind: record.kind, status: record.status, title: clean(prompt) })}\n\`\`\`\n\n`;
    return {
      markdown,
      output: {
        status: record.status === "pending" ? "started" : "done",
        kind: record.kind,
        credits: record.cost,
        note:
          record.status === "pending"
            ? "The video is rendering and will appear in the chat by itself in 1–3 minutes. Tell the user briefly."
            : "The file is already shown to the user in the chat. Do not add a link or markdown for it.",
      },
    };
  } catch (error: any) {
    return {
      output: {
        error: String(error?.message || "Generation failed").slice(0, 300),
      },
    };
  }
}

const MEDIA_FENCE = /```genyxo-media\n(\{.*\})\n```/g;
/** Later turns see "[Generated video: …]" instead of the player markup. */
export function describeMediaFences(content: string) {
  if (!content.includes("genyxo-media")) return content;
  return content.replace(MEDIA_FENCE, (_match, json: string) => {
    try {
      const card = JSON.parse(json) as { kind?: string; title?: string };
      return `[Generated ${card.kind || "media"}: ${card.title || ""}]`;
    } catch {
      return "[Generated media]";
    }
  });
}
