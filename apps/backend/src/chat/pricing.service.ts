import { Injectable } from "@nestjs/common";

export enum ModelType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
}

@Injectable()
export class PricingService {
  private readonly MODELS_CONFIG = {
    "arcee-ai/trinity-large-preview:free": { cost: 0, type: ModelType.TEXT },
    "openai/gpt-oss-120b:free": { cost: 0, type: ModelType.TEXT },
    "google/gemini-3.5-flash": { cost: 0, type: ModelType.TEXT },
    "google/gemini-3.5-live-translate-preview": {
      cost: 0,
      type: ModelType.TEXT,
    },
    "google/gemini-3.1-flash-lite": { cost: 0, type: ModelType.TEXT },
    "google/gemini-2.5-pro": { cost: 0, type: ModelType.TEXT },
    "google/gemini-2.5-flash": { cost: 0, type: ModelType.TEXT },
    "google/gemini-2.5-flash-native-audio-preview-12-2025": {
      cost: 0,
      type: ModelType.TEXT,
    },
    "google/gemini-embedding-2": { cost: 0, type: ModelType.TEXT },
    "google/gemini-robotics-er-1.6-preview": { cost: 0, type: ModelType.TEXT },
    "meta-llama/llama-3.3-70b-instruct:free": { cost: 0, type: ModelType.TEXT },
    "qwen/qwen3-next-80b-a3b-instruct:free": { cost: 0, type: ModelType.TEXT },
    "google/gemma-4-31b-it:free": { cost: 0, type: ModelType.TEXT },
    "openai/gpt-5.1": { cost: 150, type: ModelType.TEXT },
    "openai/gpt-5-mini": { cost: 70, type: ModelType.TEXT },
    "openai/gpt-5-nano": { cost: 45, type: ModelType.TEXT },
    "openai/gpt-4.1": { cost: 55, type: ModelType.TEXT },
    "openai/gpt-4.1-mini": { cost: 25, type: ModelType.TEXT },
    "openai/gpt-4o": { cost: 40, type: ModelType.TEXT },
    "openai/gpt-4o-mini": { cost: 20, type: ModelType.TEXT },
    "openai/o1-preview": { cost: 100, type: ModelType.TEXT },
    "openai/o3-reasoning": { cost: 150, type: ModelType.TEXT },
    "anthropic/claude-sonnet-4.6": { cost: 75, type: ModelType.TEXT },
    "anthropic/claude-sonnet-4.5": { cost: 70, type: ModelType.TEXT },
    "anthropic/claude-opus-4.6": { cost: 150, type: ModelType.TEXT },
    "anthropic/claude-opus-4.5": { cost: 140, type: ModelType.TEXT },
    "anthropic/claude-haiku-4.5": { cost: 50, type: ModelType.TEXT },
    "anthropic/claude-3-haiku": { cost: 30, type: ModelType.TEXT },
    // 'deepseek/deepseek-chat': { cost: 5 },
    // 'google/gemini-pro-1.5': { cost: 30 },
    "openai/dall-e-3": { cost: 120, type: ModelType.IMAGE },
    "kling-video": { cost: 500, type: ModelType.VIDEO },
  };

  getModelConfig(modelId: string) {
    const config = this.MODELS_CONFIG[modelId];
    if (!config) return undefined;
    return config;
  }

  getCost(modelId: string): number {
    return this.getModelConfig(modelId)?.cost ?? 0;
  }
}
