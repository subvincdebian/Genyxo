import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
  Get,
  Param,
  Patch,
  Delete,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionType } from 'src/transactions/transaction.entity';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';
import { FalService } from './fal.service';
import { PricingService } from './pricing.service';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private falService: FalService,
    private pricingService: PricingService
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history/:id')
  async getChatHistory(@Param('id') id: number, @Request() req) {
    return this.chatService.getConversationMessages(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('message')
  async sendMessage(@Body() body: { message: string, model: string, conversationId?: number }, @Request() req) {
      const userId = req.user.id;
      const { message, conversationId, model } = body;
      const selectedModel = model || 'openai/gpt-4o-mini';

      const modelConfig = this.pricingService.getModelConfig(selectedModel);
      const cost = modelConfig.cost;

      const isDeducted = await this.usersService.deductCredits(userId, cost);
      if (!isDeducted) throw new ForbiddenException(`Not enough credits.`);

      if (!message || message.trim().length === 0) {
        throw new BadRequestException("Message cannot be empty");
      }
      if (message.length > 750) {
        throw new BadRequestException("Message is too long (max 750 characters)");
      }

      if (!cost) throw new BadRequestException(`Unknown AI model: ${selectedModel}`);

      try {
          const result = await this.chatService.processMessage(userId, message, selectedModel, conversationId);
          await this.usersService.logTransaction(
              userId, 
              -cost,
              TransactionType.SPEND, 
              `Used AI Model: ${selectedModel}`
          );
          const newBalance = await this.usersService.getBalance(userId);

          return {
            botReply: result.botReply,
            conversationId: result.conversationId,
            messageId: result.messageId,
            status: result.status,
            creditsLeft: newBalance
          };

      } catch (error) {
          await this.usersService.addCredits(userId, cost);

          await this.usersService.logTransaction(
            userId, 
            cost, 
            TransactionType.REFUND, 
            `Refund for failed ${selectedModel} request`
          );
          
          throw new InternalServerErrorException(
              "The AI service is temporarily unavailable. Your credits have been refunded."
          );
      }

      const newBalance = await this.usersService.getBalance(userId);
      
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('conversation/:id')
  async rename(@Param('id') id: number, @Body('title') title: string, @Request() req) {
      return this.chatService.renameConversation(req.user.id, id, title);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('conversation/:id')
  async delete(@Param('id') id: number, @Request() req) {
      return this.chatService.deleteConversation(req.user.id, id);
  }

  @Post('webhook/video')
  async handleFalWebhook(@Body() data: any) {
      const { request_id, status, payload } = data;

      if (status === 'COMPLETED' && payload?.video?.url) {
          await this.chatService.updateVideoUrl(request_id, payload.video.url);
      } else if (status === 'ERROR') {
          await this.chatService.updateVideoUrl(request_id, "❌ Error Generating Video.");
      }
      return { status: 'ok' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('message-status/:id')
  async getMessageStatus(@Param('id') id: number) {
      const message = await this.chatService.getMessageById(id);
      if (!message) throw new NotFoundException('Message not found');

      const isReady = message.content.startsWith('http');
      return {
          isReady: isReady,
          videoUrl: isReady ? message.content : null
      };
  }
}
