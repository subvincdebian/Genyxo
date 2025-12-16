import { Module } from '@nestjs/common';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
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
      username: process.env.MYSQLUSER || 'nest_user',
      password: process.env.MYSQLPASSWORD || 'Atlanticus123cus123',
      database: process.env.MYSQLDATABASE || 'my_perfect_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), 
    }),
    AuthModule,
    UsersModule,
    ProfileModule,
    ChatModule,
    PaymentModule,
    AdminModule,
    SupportModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
