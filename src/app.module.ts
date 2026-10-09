import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MailerModule } from "@nestjs-modules/mailer";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { RedisModule } from "@liaoliaots/nestjs-redis";
import { ThrottlerStorageRedisService } from "./common/throttler-redis.storage";
import { RedisService } from "@liaoliaots/nestjs-redis";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProfileModule } from "./profile/profile.module";
import { ChatModule } from "./chat/chat.module";
import { PaymentModule } from "./payment/payment.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { SupportModule } from "./support/support.module";
import { EmailModule } from "./email/email.module";
import { RedisCacheModule } from "./common/redis-cache.module";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { IdempotencyModule } from "./common/interceptors/idempotency.module";
import { AuditModule } from "./audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({
      config: process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
            maxRetriesPerRequest: null,
            commandTimeout: 1500,
            connectTimeout: 3000,
            enableReadyCheck: false,
            noDelay: true,
            keepAlive: 10000,
            // ssl
            tls: { rejectUnauthorized: false },
          }
        : {
            host: process.env.REDISHOST || "localhost",
            port: parseInt(process.env.REDISPORT!) || 6379,
            password: process.env.REDISPASSWORD,
            maxRetriesPerRequest: null,
            commandTimeout: 1500,
            connectTimeout: 3000,
            enableReadyCheck: false,
            noDelay: true,
            keepAlive: 10000,
          },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => {
        const redisInstance = redisService.getOrThrow();
        return {
          throttlers: [
            {
              ttl: 60000,
              limit: 120,
            },
          ],
          storage: new ThrottlerStorageRedisService(redisInstance),
        };
      },
    }),
    MailerModule.forRoot({
      transport: {
        host: "smtp.zoho.eu",
        port: 587,
        secure: false,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: "info@genyxo.com",
          pass: process.env.ZOHO_APP_PASSWORD,
        },
      },
      defaults: {
        from: '"Genyxo Support" <info@genyxo.com>',
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const tidbHost = configService.get<string>("MYSQL_TIDB_HOST");
        const isProduction =
          configService.get<string>("NODE_ENV") === "production" ||
          !!configService.get("VERCEL");

        const replicaHost = configService.get<string>("MYSQL_REPLICA_HOST");
        let connectionOptions: any;

        if (tidbHost) {
          connectionOptions = {
            host: tidbHost,
            port:
              parseInt(configService.get<string>("MYSQL_TIDB_PORT")!) || 4000,
            username: configService.get<string>("MYSQL_TIDB_USERNAME"),
            password: configService.get<string>("MYSQL_TIDB_PASSWORD"),
            database:
              configService.get<string>("MYSQL_TIDB_DATABASE") || "test",
            ssl: {
              rejectUnauthorized: true,
            },
          };
        } else if (replicaHost) {
          const masterHost =
            configService.get<string>("MYSQLHOST") || "localhost";
          const masterPort =
            parseInt(configService.get<string>("MYSQLPORT")!) || 3306;
          const masterUser = configService.get<string>("MYSQLUSER") || "root";
          const masterPassword =
            configService.get<string>("MYSQLPASSWORD") || "";
          const database =
            configService.get<string>("MYSQLDATABASE") || "genyxo";

          connectionOptions = {
            replication: {
              master: {
                host: masterHost,
                port: masterPort,
                username: masterUser,
                password: masterPassword,
                database,
              },
              slaves: [
                {
                  host: replicaHost,
                  port:
                    parseInt(
                      configService.get<string>("MYSQL_REPLICA_PORT") ||
                        String(masterPort),
                      10,
                    ) || masterPort,
                  username:
                    configService.get<string>("MYSQL_REPLICA_USER") ||
                    masterUser,
                  password:
                    configService.get<string>("MYSQL_REPLICA_PASSWORD") ||
                    masterPassword,
                  database,
                },
              ],
            },
          };
        } else {
          connectionOptions = {
            host: configService.get<string>("MYSQLHOST") || "localhost",
            port: parseInt(configService.get<string>("MYSQLPORT")!) || 3306,
            username: configService.get<string>("MYSQLUSER"),
            password: configService.get<string>("MYSQLPASSWORD"),
            database: configService.get<string>("MYSQLDATABASE"),
            ssl: configService.get("MYSQL_SSL")
              ? { rejectUnauthorized: false }
              : undefined,
          };
        }

        return {
          type: "mysql",
          ...connectionOptions,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
          migrationsTableName: "typeorm_migrations",

          // for local
          synchronize: !isProduction,
          logging: !isProduction && configService.get("DB_LOGGING") === "true",

          extra: {
            connectionLimit: configService.get("VERCEL") ? 3 : 100,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            waitForConnections: true,
            queueLimit: 0,
            connectTimeout: 20000,
            idleTimeout: 60000,
            maxIdle: 50,
            decimalNumbers: true,
            maxPreparedStatements: 16000,
          },
          retryAttempts: 10,
          retryDelay: 3000,
          autoLoadEntities: true,
        };
      },
    }),
    RedisCacheModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    ChatModule,
    PaymentModule,
    NotificationsModule,
    AdminModule,
    SupportModule,
    EmailModule,
    HealthModule,
    MetricsModule,
    IdempotencyModule,
    AuditModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
