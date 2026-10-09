import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { DataSource } from "typeorm";
import { RedisService } from "@liaoliaots/nestjs-redis";

@SkipThrottle()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  @Get()
  @Get("liveness")
  checkLiveness() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("readiness")
  async checkReadiness() {
    const checks: Record<string, string> = {
      database: "unknown",
      redis: "unknown",
    };

    let isHealthy = true;

    // Database check
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        await this.dataSource.query("SELECT 1");
        checks.database = "up";
      } catch (err: any) {
        checks.database = "down";
        isHealthy = false;
        this.logger.error(`Database health check failed: ${err.message}`);
      }
    } else if (this.dataSource && !this.dataSource.isInitialized) {
      checks.database = "down";
      isHealthy = false;
    } else {
      checks.database = "skipped";
    }

    // Redis check
    if (this.redisService) {
      try {
        const client = this.redisService.getOrThrow();
        const pong = await client.ping();
        if (pong === "PONG") {
          checks.redis = "up";
        } else {
          checks.redis = "down";
          isHealthy = false;
        }
      } catch (err: any) {
        checks.redis = "down";
        isHealthy = false;
        this.logger.error(`Redis health check failed: ${err.message}`);
      }
    } else {
      checks.redis = "skipped";
    }

    const payload = {
      status: isHealthy ? "ok" : "error",
      checks,
      timestamp: new Date().toISOString(),
    };

    if (!isHealthy) {
      throw new HttpException(payload, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return payload;
  }
}
