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
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../queues/queue.constants";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly redisService?: RedisService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue?: Queue,
  ) {}

  @ApiOperation({ summary: "Kubernetes liveness probe" })
  @Get()
  @Get("liveness")
  checkLiveness() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({ summary: "Kubernetes readiness probe" })
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

    // BullMQ Queue check
    if (this.emailQueue) {
      try {
        const isPaused = await this.emailQueue.isPaused();
        checks.emailQueue = isPaused ? "paused" : "up";
      } catch (err: any) {
        checks.emailQueue = "down";
        this.logger.error(`BullMQ queue check failed: ${err.message}`);
      }
    } else {
      checks.emailQueue = "skipped";
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
