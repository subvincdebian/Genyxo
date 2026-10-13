import {
  Global,
  Module,
  OnApplicationShutdown,
  Logger,
  Optional,
} from "@nestjs/common";
import { BullModule, InjectQueue } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "./queue.constants";
import { EmailProcessor } from "./processors/email.processor";
import { MetricsModule } from "../metrics/metrics.module";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        const isTls =
          config.get<string>("REDIS_TLS") === "true" ||
          config.get<string>("REDIS_SSL") === "true";

        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              tls: isTls ? { rejectUnauthorized: false } : undefined,
            },
          };
        }

        const host =
          config.get<string>("REDISHOST") ||
          config.get<string>("REDIS_HOST") ||
          "localhost";
        const port = parseInt(
          config.get<string>("REDISPORT") ||
            config.get<string>("REDIS_PORT") ||
            "6379",
          10,
        );
        const password =
          config.get<string>("REDISPASSWORD") ||
          config.get<string>("REDIS_PASSWORD") ||
          undefined;

        return {
          connection: {
            host,
            port,
            password,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: isTls ? { rejectUnauthorized: false } : undefined,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAIL,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    MetricsModule,
  ],
  providers: [EmailProcessor],
  exports: [BullModule, EmailProcessor],
})
export class QueuesModule implements OnApplicationShutdown {
  private readonly logger = new Logger(QueuesModule.name);

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue?: Queue,
  ) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Application shutting down (${signal || "SIGTERM"}). Closing this instance's BullMQ connections...`,
    );

    if (this.emailQueue) {
      try {
        // Nest's BullExplorer closes this instance's workers gracefully.
        // Queue.pause() would also stop healthy workers on other replicas.
        await this.emailQueue.close();
        this.logger.log(`Queue ${QUEUE_NAMES.EMAIL} closed safely.`);
      } catch (err: any) {
        this.logger.error(
          `Error closing queue ${QUEUE_NAMES.EMAIL}: ${err.message}`,
        );
      }
    }
  }
}
