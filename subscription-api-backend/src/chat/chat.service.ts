import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Subject } from 'rxjs';
import { fal } from "@fal-ai/client"; 
import { Message } from './message.entity';
import { Conversation } from './conversation.entity';
import { TransactionType } from '../transactions/transaction.entity';
import { UsersService } from '../users/users.service';
import { PricingService, ModelType } from './pricing.service';
import { FalService } from './fal.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openRouter: OpenAI;
  private googleAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private falService: FalService,
    private pricingService: PricingService,
    private usersService: UsersService,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(Conversation) private conversationRepository: Repository<Conversation>,
  ) {
    this.openRouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.configService.get('OPENROUTER_API_KEY'),
      defaultHeaders: {
        'HTTP-Referer': this.configService.get('SITE_URL') || 'http://localhost:3000', 
        'X-Title': 'Genyxo AI',
      },
    });

    this.googleAI = new GoogleGenerativeAI(this.configService.get('GOOGLE_API_KEY') || '');
  }

  async saveMessage(conversation: Conversation, content: string, sender: 'user' | 'bot', model: string, userId: number, requestId?: string) {
    const msg = this.messageRepository.create({
        content,
        sender,
        model,
        conversationId: conversation.id,
        userId: userId,
        requestId
    });
    return this.messageRepository.save(msg);
  }

  async getHistory(conversationId: number) {
    const messages = await this.messageRepository.find({
        where: { conversationId },
        order: { createdAt: 'ASC' },
        take: 50
    });
    return messages.map(m => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.content
    }));
  }

  async getUserConversations(userId: number) {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' }, 
    });
  }

  async getConversationMessages(userId: number, conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } } as any
    });

    if (!conversation) throw new NotFoundException('Chat not found');
    return conversation.messages;
  }

  private async getOrCreateConversation(userId: number, conversationId?: number, firstMessage?: string): Promise<Conversation> {
    if (conversationId && conversationId !== 0) {
        const chat = await this.conversationRepository.findOne({ 
          where: { id: conversationId, userId } 
        });
        if (!chat) throw new NotFoundException('Chat not found');
        return chat;
    }
    const title = firstMessage ? (firstMessage.substring(0, 30)) : "New Chat";
    const newChat = this.conversationRepository.create({ 
      userId, 
      title: title 
    });
    
    return this.conversationRepository.save(newChat);
  }

  async processMessage(userId: number, text: string, model: string, conversationId?: number) {
    const modelConfig = this.pricingService.getModelConfig(model);
    if (!modelConfig) throw new BadRequestException('Unsupported model');
    
    let conversation = await this.getOrCreateConversation(userId, conversationId, text);
    await this.saveMessage(conversation, text, 'user', model, userId);

    if (modelConfig.type === ModelType.VIDEO) {
        const requestId = await this.falService.triggerVideoGeneration(text, model);

        const botMsg = this.messageRepository.create({
            content: "🎬 Video generating... Wait 1-2 minutes please.",
            sender: 'bot',
            model,
            conversation,
            userId: userId,
            requestId: requestId
        });
        const savedBotMsg = await this.messageRepository.save(botMsg);

        return { 
            botReply: savedBotMsg.content, 
            conversationId: conversation.id, 
            messageId: savedBotMsg.id,
            status: 'processing' 
        };
    } else {
        const history = await this.getHistory(conversation.id);
        const aiResponse = await this.getAiResponse(history, model);

        const botMsg = await this.saveMessage(conversation, aiResponse.reply, 'bot', model, userId);

        return { 
            botReply: botMsg.content, 
            conversationId: conversation.id,
            messageId: botMsg.id,
            status: 'done'
        };
    }
  }

  async processStreamingMessage(userId: number, text: string, model: string, conversationId: number | undefined, cost: number) {
      const eventStream = new Subject<MessageEvent>();
      let conversation = await this.getOrCreateConversation(userId, conversationId, text);
      
      await this.saveMessage(conversation, text, 'user', model, userId);

      (async () => {
        try {
          let fullReply = '';

          if (model.startsWith('google/gemini')) {
            const geminiModelName = model.replace('google/', ''); // Вырезаем 'google/' -> получаем 'gemini-2.5-flash'
            const generativeModel = this.googleAI.getGenerativeModel({ model: geminiModelName });
            
            const history = await this.getHistory(conversation.id);
            
            const geminiHistory = history.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }));

            const chatSession = generativeModel.startChat({
              history: geminiHistory.slice(0, -1)
            });

            const lastMessage = geminiHistory[geminiHistory.length - 1].parts[0].text || '';
            
            const resultStream = await chatSession.sendMessageStream(lastMessage);

            for await (const chunk of resultStream.stream) {
              const content = chunk.text() || '';
              if (content) {
                fullReply += content;
                eventStream.next({ 
                  data: { token: content, conversationId: conversation.id } 
                } as MessageEvent);
              }
            }

          } else {
            const response = await this.openRouter.chat.completions.create({
              model: model,
              messages: (await this.getHistory(conversation.id)) as any,
              stream: true,
              max_tokens: 2000,
            });

            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullReply += content;
                eventStream.next({ 
                  data: { token: content, conversationId: conversation.id } 
                } as MessageEvent);
              }
            }
          }

          const savedMsg = await this.saveMessage(conversation, fullReply, 'bot', model, userId);
          await this.usersService.logTransaction(userId, -cost, TransactionType.SPEND, `AI: ${model}`);

          eventStream.next({ 
            data: { status: 'done', messageId: savedMsg.id, creditsLeft: await this.usersService.getBalance(userId) } 
          } as MessageEvent);
          
          eventStream.complete();
        } catch (error: any) {
            this.logger.error(`Stream Error: ${error.message}`);
            await this.usersService.addCredits(userId, cost);
            await this.usersService.logTransaction(userId, cost, TransactionType.REFUND, `Stream Error Refund: ${model}`);
            eventStream.next({ 
                data: { error: error.message || 'Connection lost' } 
            } as any);
            eventStream.error(error);
        }
      })();

      return eventStream.asObservable();
  }

  async getMessageById(id: number) {
    return this.messageRepository.findOne({ where: { id } });
  }

  async updateVideoUrl(requestId: string, videoUrl: string) {
    const message = await this.messageRepository.findOne({ where: { requestId } });
    if (message) {
        message.content = videoUrl;
        await this.messageRepository.save(message);
    }
  }

  async getAiResponse(messagesHistory: any[], model: string) {
    try {
      if (model.includes('dall-e')) {
        const completion = await this.openRouter.images.generate({
          model: "openai/dall-e-3",
          prompt: messagesHistory[messagesHistory.length - 1].content,
          n: 1,
        });
        if (!completion.data || completion.data.length === 0) {
          throw new Error('No image generated');
        }
        return { 
          reply: `Here is your image: <br><img src="${completion.data[0].url}" class="chat-img">`, 
          tokensUsed: 120
        };
      }

      if (model.startsWith('google/gemini')) {
        const geminiModelName = model.replace('google/', '');
        const generativeModel = this.googleAI.getGenerativeModel({ model: geminiModelName });

        const geminiHistory = messagesHistory.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const chatSession = generativeModel.startChat({
          history: geminiHistory.slice(0, -1)
        });

        const lastMessage = geminiHistory[geminiHistory.length - 1].parts[0].text || '';
        const result = await chatSession.sendMessage(lastMessage);
        const responseText = result.response.text();

        return {
          reply: responseText || "AI did not respond",
          tokensUsed: result.response.usageMetadata?.totalTokenCount || 0
        };
      }

      const completion = await this.openRouter.chat.completions.create({
        model: model,
        messages: messagesHistory as any,
        max_tokens: 2000,
        temperature: 0.7,
      });

      return {
        reply: completion.choices[0].message.content || "AI did not respond",
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error: any) {
      console.error('API Error:', error.message);
      throw error;
    }
  }

  async generateVideo(prompt: string, model: string) {
    try {
        const webhookUrl = `${this.configService.get('SITE_URL')}/chat/webhook/video?secret=${this.configService.get('WEBHOOK_SECRET')}`;

        const result: any = await fal.queue.submit(`fal-ai/${model}`, {
            input: {
                prompt: prompt,
                video_size: "landscape"
            },
            webhookUrl: webhookUrl
        });

        return {
            videoUrl: result.video?.url,
            requestId: result.request_id 
        };
    } catch (error) {
        console.error("Kling Generation Error:", error);
        throw new Error("Failed to generate video");
    }
  }

  async renameConversation(userId: number, id: number, newTitle: string) {
    const chat = await this.conversationRepository.findOne({ where: { id, userId } });
    if (!chat) throw new NotFoundException();
    chat.title = newTitle;
    return this.conversationRepository.save(chat);
  }

  async deleteConversation(userId: number, id: number) {
    const chat = await this.conversationRepository.findOne({ where: { id, userId } });
    if (!chat) throw new NotFoundException();
    return this.conversationRepository.remove(chat);
  }
}
