import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { Message } from './message.entity';

@Module({
  imports: [ConfigModule, UsersModule, TypeOrmModule.forFeature([Message])],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
