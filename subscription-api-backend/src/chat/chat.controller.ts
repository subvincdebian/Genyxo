import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request, 
  ForbiddenException, 
  BadRequestException, 
  Get, 
  Param,   // <--- Додано
  Patch,   // <--- Додано
  Delete   // <--- Додано
} from '@nestjs/common';
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
    // Витягуємо змінні з body, щоб вони були доступні
    const { message, conversationId } = body;
    const selectedModel = body.model || 'gpt-4o-mini';

    const cost = this.MODEL_PRICES[selectedModel];

    if (!cost) {
        throw new BadRequestException(`Unknown AI model: ${selectedModel}`);
    }

    // 1. Списання кредитів
    const isDeducted = await this.usersService.deductCredits(userId, cost);

    if (!isDeducted) {
        throw new ForbiddenException(`Not enough credits for ${selectedModel}. Price: ${cost} Credits.`);
    }

    // 2. Обробка повідомлення (збереження, AI, історія) перенесена в сервіс
    // Ми більше не викликаємо saveMessage вручну тут, бо processMessage це робить
    const result = await this.chatService.processMessage(
        userId, 
        message, 
        selectedModel, 
        conversationId
    );

    const newBalance = await this.usersService.getBalance(userId);

    return {
      botReply: result.botReply,
      conversationId: result.conversationId,
      creditsLeft: newBalance,
      title: result.title
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
}
