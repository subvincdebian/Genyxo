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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQLHOST || 'localhost',
      port: parseInt(process.env.PORT!) || 3306,
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
