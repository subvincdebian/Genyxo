import { Controller, Post, Body, UseGuards, Request, ForbiddenException, BadRequestException, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { UsersService } from '../users/users.service';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService
  ) {}

  // Прайс-лист
  private readonly MODEL_PRICES = {
    'gpt-5.1': 50,
    'gpt-5-mini': 30,
    'gpt-5-nano': 25,

    'gpt-4.1': 30,
    'gpt-4.1-mini': 20,

    'gpt-4o': 40,
    'gpt-4o-mini': 40,

    'o1-preview': 40,
    'o3-reasoning': 75,

    'dall-e-3': 100
  };

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  async getHistory(@Request() req) {
    return this.chatService.getHistory(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('message')
  async sendMessage(
    @Body('message') message: string, 
    @Body('model') model: string, 
    @Request() req
  ) {
    const userId = req.user.id;
    const selectedModel = model || 'gpt-4o-mini';
    const cost = this.MODEL_PRICES[selectedModel];

    if (!cost) {
        throw new BadRequestException(`Unknown AI model: ${selectedModel}`);
    }

    // 1. Спроба списання
    const isDeducted = await this.usersService.deductCredits(userId, cost);

    if (!isDeducted) {
        throw new ForbiddenException(`Not enough credits for ${selectedModel}. Price: ${cost} Credits.`);
    }

    await this.chatService.saveMessage(userId, message, 'user', selectedModel);

    const previousMessages = await this.chatService.getHistory(userId);

    const apiMessages = previousMessages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant', // 'assistant' - це роль бота в API
        content: msg.content
    }));

    const aiResponse = await this.chatService.getAiResponse(apiMessages, selectedModel);
    
    await this.chatService.saveMessage(userId, aiResponse.reply, 'bot', selectedModel);

    const newBalance = await this.usersService.getBalance(userId);

    return {
      user: req.user.email,
      botReply: aiResponse.reply,
      creditsLeft: newBalance,
      // cost: cost
    };
  }
}
