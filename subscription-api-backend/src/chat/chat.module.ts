import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Message } from './message.entity';
import { Conversation } from './conversation.entity';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FalService } from './fal.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [
    ConfigModule, 
    UsersModule, 
    TypeOrmModule.forFeature([Message, Conversation]) 
  ],
  providers: [ChatService, FalService, PricingService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
