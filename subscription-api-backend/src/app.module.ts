import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';

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

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDISHOST || 'localhost',
        port: parseInt(process.env.REDISPORT!) || 6379,
        password: process.env.REDISPASSWORD,
      },
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{
          ttl: 60000,
          limit: 20,
        }],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: process.env.REDISHOST || 'localhost',
            port: parseInt(process.env.REDISPORT!) || 6379,
            password: process.env.REDISPASSWORD,
          })
        ),
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
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
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQLHOST || 'localhost',
      port: parseInt(process.env.MYSQLPORT!) || 3306,
      username: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      extra: {
        connectionLimit: 100, 
        
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 20000,
      },
      retryAttempts: 10,
      retryDelay: 3000,
      autoLoadEntities: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), 
    }),
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
