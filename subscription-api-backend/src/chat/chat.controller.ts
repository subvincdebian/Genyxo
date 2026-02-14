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
  InternalServerErrorException,
  Query,
  Sse,
  MessageEvent,
  Headers
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { TransactionType } from 'src/transactions/transaction.entity';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';
import { FalService } from './fal.service';
import { PricingService } from './pricing.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private falService: FalService,
    private pricingService: PricingService,
    private configService: ConfigService
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
  @Sse('stream')
  async streamMessage(
    @Query('message') message: string,
    @Query('model') model: string,
    @Query('conversationId') conversationId: string,
    @Request() req
  ): Promise<Observable<MessageEvent>> {
    const userId = req.user.id;
    const selectedModel = model || 'openai/gpt-4o-mini';
    const convId = conversationId ? parseInt(conversationId) : 0;

    const modelConfig = this.pricingService.getModelConfig(selectedModel);
    const cost = modelConfig.cost;

    const isDeducted = await this.usersService.deductCredits(userId, cost);
    if (!isDeducted) throw new ForbiddenException('Not enough credits');

    return this.chatService.processStreamingMessage(userId, message, selectedModel, convId, cost);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('message')
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
      const userId = req.user.id;
      const { message, conversationId, model } = dto;

      const modelConfig = this.pricingService.getModelConfig(model);
      if (!modelConfig) throw new BadRequestException(`Model ${model} not supported`);

      const cost = modelConfig.cost;

      if (!message?.trim()) throw new BadRequestException("Message cannot be empty");
      if (message.length > 750) throw new BadRequestException("Message too long");

      const isDeducted = await this.usersService.deductCredits(userId, cost);
      if (!isDeducted) throw new ForbiddenException(`Not enough credits.`);

      try {
          const result = await this.chatService.processMessage(userId, message, model, conversationId);
          await this.usersService.logTransaction(
              userId, 
              -cost,
              TransactionType.SPEND, 
              `Used AI Model: ${model}`
          );

          return {
            ...result,
            creditsLeft: await this.usersService.getBalance(userId)
          };

      } catch (error) {
          await this.usersService.addCredits(userId, cost);

          await this.usersService.logTransaction(
            userId, 
            cost, 
            TransactionType.REFUND, 
            `Refund for failed ${model} request`
          );
          
          throw new InternalServerErrorException(
              "The AI service is temporarily unavailable. Your credits have been refunded."
          );
      }
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
  async handleFalWebhook(
    @Body() data: any, 
    @Headers('x-webhook-secret') secret: string
  ) {
    const configSecret = this.configService.get('WEBHOOK_SECRET');
    if (secret !== configSecret) throw new ForbiddenException('Invalid webhook secret');

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
