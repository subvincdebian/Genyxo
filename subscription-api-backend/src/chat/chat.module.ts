import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { Message } from './message.entity';
import { Conversation } from './conversation.entity';
import { FalService } from './fal.service';

@Module({
  imports: [
    ConfigModule, 
    UsersModule, 
    TypeOrmModule.forFeature([Message, Conversation]) 
  ],
  providers: [ChatService, FalService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
