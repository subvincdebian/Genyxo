import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fal from "@fal-ai/serverless-client";

@Injectable()
export class FalService {
  constructor(private configService: ConfigService) {
    process.env.FAL_KEY = this.configService.get('FAL_KEY');
  }

  async triggerVideoGeneration(prompt: string, model: string) {
    const result = await fal.queue.submit(`fal-ai/${model}`, {
      input: { prompt: prompt },
      webhookUrl: `${this.configService.get('BASE_URL')}/chat/webhook/video`, 
    });
    return result.request_id;
  }
}
