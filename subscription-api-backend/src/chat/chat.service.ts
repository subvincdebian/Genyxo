import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async saveMessage(userId: number, content: string, sender: 'user' | 'bot', model: string) {
    const message = this.messageRepository.create({
      user: { id: userId },
      content,
      sender,
      model,
    });
    await this.messageRepository.save(message);
  }

  async getHistory(userId: number): Promise<Message[]> {
    return this.messageRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'ASC' },
    });
  }

  async getAiResponse(messagesHistory: any[], model: string = 'gpt-4o-mini') {
    try {
      let replyText = '';
      let tokensUsed = 0;

      if (model === 'dall-e-3') {
          const lastMessage = messagesHistory[messagesHistory.length - 1].content;
          
          const image = await this.openai.images.generate({
            model: "dall-e-3",
            prompt: lastMessage,
            n: 1,
            size: "1024x1024",
          });
          
          const imageUrl = image.data?.[0]?.url;
          
          if (imageUrl) {
              replyText = `Here is your image: <br><img src="${imageUrl}" style="max-width: 100%; border-radius: 10px;">`;
              tokensUsed = 50;
          } else {
              replyText = "Sorry, the image could not be generated.";
              tokensUsed = 0;
          }
      } 
      else {
          const completion = await this.openai.chat.completions.create({
            messages: messagesHistory,
            model: model,
          });
          
          const content = completion.choices[0].message.content;
          replyText = content || "Sorry, the AI ​​didn't provide an answer."; 
          
          tokensUsed = completion.usage?.total_tokens || 0;
      }

      return { reply: replyText, tokensUsed };

    } catch (error) {
      console.error('OpenAI Error:', error.response?.data || error.message);
      // Якщо помилка то, найчастіше це:
      // 1. Неправильний API_KEY
      // 2. Немає грошей на балансі OpenAI
      // 3. Неправильна назва моделі
      return { reply: "There was an error connecting to AI. Check your API key and balance.", tokensUsed: 0 };
    }
  }
}
