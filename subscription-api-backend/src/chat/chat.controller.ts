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
  NotFoundException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { UsersService } from '../users/users.service';
import { FalService } from './fal.service';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private falService: FalService
  ) {}

  private readonly MODEL_PRICES = {
    'gpt-5.1': 150,
    'gpt-5-mini': 70,
    'gpt-5-nano': 45,

    'gpt-4.1': 55,
    'gpt-4.1-mini': 25,

    'gpt-4o': 40,
    'gpt-4o-mini': 18,

    'o1-preview': 90,
    'o3-reasoning': 140,

    'dall-e-3': 120,

    'kling-video': 500,
    'luma-video': 450,
  };

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
    const selectedModel = model || 'gpt-4o-mini';

    const cost = this.MODEL_PRICES[selectedModel];
    if (!cost) throw new BadRequestException(`Unknown AI model: ${selectedModel}`);

    const isDeducted = await this.usersService.deductCredits(userId, cost);
    if (!isDeducted) throw new ForbiddenException(`Not enough credits.`);

    const result = await this.chatService.processMessage(userId, message, selectedModel, conversationId);
    const newBalance = await this.usersService.getBalance(userId);

    return {
      botReply: result.botReply,
      conversationId: result.conversationId,
      messageId: result.messageId,
      status: result.status,
      creditsLeft: newBalance
    };
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
