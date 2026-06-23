import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fal } from "@fal-ai/client";

@Injectable()
export class FalService {
  constructor(private configService: ConfigService) {
    process.env.FAL_KEY = this.configService.get("FAL_KEY");
  }

  async triggerVideoGeneration(prompt: string, model: string) {
    const webhookUrl = `${this.configService.get("SITE_URL")}/chat/webhook/video?secret=${this.configService.get("WEBHOOK_SECRET")}`;
    const result: any = await fal.queue.submit(`fal-ai/${model}`, {
      input: { prompt },
      webhookUrl: webhookUrl,
    });
    return result.request_id;
  }
}
