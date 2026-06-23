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
    if (!config) return { cost: 100, type: ModelType.TEXT };
    return config;
  }

  getCost(modelId: string): number {
    return this.getModelConfig(modelId).cost;
  }
}
