import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { Conversation } from './conversation.entity';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(Conversation) private conversationRepository: Repository<Conversation>,
  ) {
    this.openai = new OpenAI({ apiKey: this.configService.get('OPENAI_API_KEY') });
  }

  async getUserConversations(userId: number) {
    return this.conversationRepository.find({
      where: { user: { id: userId } },
      order: { updatedAt: 'DESC' }, 
    });
  }

  async getConversationMessages(userId: number, conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, user: { id: userId } },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } } as any
    });

    if (!conversation) throw new NotFoundException('Chat not found');
    return conversation.messages;
  }

  async processMessage(userId: number, text: string, model: string, conversationId?: number) {
    let conversation: Conversation;

    if (!conversationId) {
      conversation = this.conversationRepository.create({
        user: { id: userId },
        title: text.substring(0, 30) + '...', 
      });
      await this.conversationRepository.save(conversation);
    } else {
      const existingChat = await this.conversationRepository.findOne({ where: { id: conversationId } });
      
      if (!existingChat) {
          throw new NotFoundException('Chat not found');
      }
      
      conversation = existingChat;
      
      conversation.updatedAt = new Date(); 
      await this.conversationRepository.save(conversation);
    }

    const userMsg = this.messageRepository.create({
      content: text,
      sender: 'user',
      model,
      conversation,
      user: { id: userId } 
    });
    await this.messageRepository.save(userMsg);

    const history = await this.messageRepository.find({
        where: { conversation: { id: conversation.id } },
        order: { createdAt: 'ASC' },
        take: 10
    });
    
    const apiMessages = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const aiResponse = await this.getAiResponse(apiMessages, model);

    const botMsg = this.messageRepository.create({
      content: aiResponse.reply,
      sender: 'bot',
      model,
      conversation,
      user: { id: userId }
    });
    await this.messageRepository.save(botMsg);

    return { 
        botReply: aiResponse.reply, 
        conversationId: conversation.id,
        title: conversation.title 
    };
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
      return { reply: "There was an error connecting to AI. Check your API key and balance.", tokensUsed: 0 };
    }
  }

  async renameConversation(userId: number, id: number, newTitle: string) {
    const chat = await this.conversationRepository.findOne({ where: { id, user: { id: userId } } });
    if (!chat) throw new NotFoundException();
    chat.title = newTitle;
    return this.conversationRepository.save(chat);
  }

  async deleteConversation(userId: number, id: number) {
    const chat = await this.conversationRepository.findOne({ where: { id, user: { id: userId } } });
    if (!chat) throw new NotFoundException();
    return this.conversationRepository.remove(chat);
  }
}
