import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fal } from "@fal-ai/client";
import { CircuitBreakerService } from "../common/resilience/circuit-breaker.service";
import { CIRCUIT_BREAKER_NAMES } from "../common/resilience/circuit-breaker.constants";

@Injectable()
export class FalService {
  constructor(
    private configService: ConfigService,
    @Optional() private readonly circuitBreakerService?: CircuitBreakerService,
  ) {
    process.env.FAL_KEY = this.configService.get("FAL_KEY");
  }

  async triggerVideoGeneration(prompt: string, model: string) {
    const webhookUrl = `${this.configService.get("SITE_URL")}/chat/webhook/video?secret=${this.configService.get("WEBHOOK_SECRET")}`;

    const executeCall = () =>
      fal.queue.submit(`fal-ai/${model}`, {
        input: { prompt },
        webhookUrl: webhookUrl,
      });

    const result: any = this.circuitBreakerService
      ? await this.circuitBreakerService.execute(
          CIRCUIT_BREAKER_NAMES.FAL_AI,
          executeCall,
        )
      : await executeCall();

    return result.request_id;
  }
}
