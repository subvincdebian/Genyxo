import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ThrottlerStorageRedisService } from './common/throttler-redis.storage';
import { RedisService } from '@liaoliaots/nestjs-redis';

import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { ChatModule } from './chat/chat.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { EmailModule } from './email/email.module';
import { RedisCacheModule } from './common/redis-cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({
      config: process.env.REDIS_URL
        ? { 
            url: process.env.REDIS_URL,
            maxRetriesPerRequest: null,
            // ssl
            tls: { rejectUnauthorized: false }
          }
        : {
            host: process.env.REDISHOST || 'localhost',
            port: parseInt(process.env.REDISPORT!) || 6379,
            password: process.env.REDISPASSWORD,
            maxRetriesPerRequest: null,
          },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => {
        const redisInstance = redisService.getOrThrow();
        return {
          throttlers: [{
            ttl: 60000,
            limit: 20,
          }],
          storage: new ThrottlerStorageRedisService(redisInstance),
        };
      },
    }),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.zoho.eu',
        port: 587,
        secure: false,
        auth: {
          user: 'info@genyxo.com',
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
        const tidbHost = configService.get<string>('MYSQL_TIDB_HOST');
        const isProduction = configService.get<string>('NODE_ENV') === 'production' || !!configService.get('VERCEL');

        const connectionOptions = tidbHost
          ? {
              // TiDB CLOUD
              host: tidbHost,
              port: parseInt(configService.get<string>('MYSQL_TIDB_PORT')!) || 4000,
              username: configService.get<string>('MYSQL_TIDB_USERNAME'),
              password: configService.get<string>('MYSQL_TIDB_PASSWORD'),
              database: configService.get<string>('MYSQL_TIDB_DATABASE') || 'test',
              ssl: {
                rejectUnauthorized: true,
              },
            }
          : {
              // RAILWAY / LOCAL MYSQL
              host: configService.get<string>('MYSQLHOST') || 'localhost',
              port: parseInt(configService.get<string>('MYSQLPORT')!) || 3306,
              username: configService.get<string>('MYSQLUSER'),
              password: configService.get<string>('MYSQLPASSWORD'),
              database: configService.get<string>('MYSQLDATABASE'),
              // ssl: configService.get('MYSQL_SSL') ? { rejectUnauthorized: false } : undefined
            };

        return {
          type: 'mysql',
          ...connectionOptions,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          
          // for local
          synchronize: !isProduction,
          logging: !isProduction && configService.get('DB_LOGGING') === 'true',
          
          extra: {
            connectionLimit: configService.get('VERCEL') ? 3 : 100, 
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            waitForConnections: true,
            queueLimit: 0,
            connectTimeout: 20000,
          },
          retryAttempts: 10,
          retryDelay: 3000,
          autoLoadEntities: true,
        };
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), 
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
