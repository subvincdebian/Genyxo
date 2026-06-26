import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { Response } from 'express';
import { fal } from "@fal-ai/client"; 
import { Message, IAttachedFile } from './message.entity';
import { Conversation } from './conversation.entity';
import { TransactionType } from '../transactions/transaction.entity';
import { UsersService } from '../users/users.service';
import { PricingService, ModelType } from './pricing.service';
import { FalService } from './fal.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly maxInlineDataLength = 5_500_000;
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

  async saveMessage(
    conversation: Conversation, 
    content: string, 
    sender: 'user' | 'bot', 
    model: string, 
    userId: number, 
    requestId?: string,
    files: IAttachedFile[] | null = null
  ) {
    const msg = this.messageRepository.create({
        content,
        sender,
        model,
        conversationId: conversation.id,
        userId,
        requestId,
        files
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

  private canSendInlineToGemini(mimeType: string) {
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/pdf'
    );
  }

  private buildGeminiFileParts(files: IAttachedFile[]) {
    const parts: any[] = [];

    for (const file of files) {
      const mimeType = file.mime_type || 'application/octet-stream';
      const fileName = file.name || 'attached file';
      const fileSize = typeof file.size === 'number' ? `, ${file.size} bytes` : '';

      parts.push({ text: `[Attached file: ${fileName}, ${mimeType}${fileSize}]` });

      if (file.data && this.canSendInlineToGemini(mimeType)) {
        parts.push({ inlineData: { data: file.data, mimeType } });
      } else {
        parts.push({
          text: `[The file content is not available inline because this file type is not supported for direct AI inspection.]`,
        });
      }
    }

    return parts;
  }

  private normalizeAttachedFiles(files: IAttachedFile[] = []) {
    return files.map((file) => {
      const mimeType = file.mime_type || 'application/octet-stream';
      const normalized: IAttachedFile = {
        mime_type: mimeType,
        name: file.name || 'attached file',
        size: file.size,
      };

      if (
        file.data &&
        file.data.length <= this.maxInlineDataLength &&
        this.canSendInlineToGemini(mimeType)
      ) {
        normalized.data = file.data;
      }

      return normalized;
    });
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

  async processMessage(userId: number, text: string, model: string, conversationId?: number, files: IAttachedFile[] = []) {
    const modelConfig = this.pricingService.getModelConfig(model);
    if (!modelConfig) throw new BadRequestException('Unsupported model');
    const normalizedFiles = this.normalizeAttachedFiles(files);
    
    const displayTitle = text || (normalizedFiles.length > 0 ? `Sent ${normalizedFiles.length} file(s)` : 'New Chat');
    let conversation = await this.getOrCreateConversation(userId, conversationId, displayTitle);
    
    await this.saveMessage(conversation, text, 'user', model, userId, undefined, normalizedFiles);

    if (modelConfig.type === ModelType.VIDEO) {
        const prompt = text || "Generate video based on provided source asset";
        const requestId = await this.falService.triggerVideoGeneration(prompt, model);

        const botMsg = this.messageRepository.create({
            content: "🎬 Video generating... Wait 1-2 minutes please.",
            sender: 'bot',
            model,
            conversationId: conversation.id,
            userId,
            requestId
        });
        const savedBotMsg = await this.messageRepository.save(botMsg);

        return { 
            botReply: savedBotMsg.content, 
            conversationId: conversation.id, 
            messageId: savedBotMsg.id,
            status: 'processing' 
        };
    } else {
        const dbMessages = await this.messageRepository.find({
            where: { conversationId: conversation.id },
            order: { createdAt: 'ASC' },
            take: 10
        });

        const aiResponse = await this.getAiResponse(dbMessages, model);
        const botMsg = await this.saveMessage(conversation, aiResponse.reply, 'bot', model, userId);

        return { 
            botReply: botMsg.content, 
            conversationId: conversation.id, 
            messageId: botMsg.id,
            status: 'done'
        };
    }
  }

  async processStreamingMessage(
    userId: number, 
    text: string, 
    model: string, 
    conversationId: number | undefined, 
    cost: number,
    files: IAttachedFile[],
    res: Response
  ) {
      const abortController = new AbortController();

      res.on('close', () => {
          abortController.abort();
      });

      try {
        const normalizedFiles = this.normalizeAttachedFiles(files);
        const displayTitle = text || (normalizedFiles.length > 0 ? `Sent ${normalizedFiles.length} file(s)` : 'New Chat');
        let conversation = await this.getOrCreateConversation(userId, conversationId, displayTitle);
        
        await this.saveMessage(conversation, text, 'user', model, userId, undefined, normalizedFiles);
        res.write(`data: ${JSON.stringify({
          status: 'conversation',
          conversationId: conversation.id,
          conversationTitle: conversation.title,
        })}\n\n`);

        let fullReply = '';
        
        const dbMessages = await this.messageRepository.find({
          where: { conversationId: conversation.id },
          order: { createdAt: 'ASC' },
          take: 10
        });

        if (model.startsWith('google/gemini')) {
          const geminiModelName = model.replace('google/', '');
          const generativeModel = this.googleAI.getGenerativeModel({ model: geminiModelName });
          
          const contents: Content[] = [];
          let lastRole: string | null = null;

          for (const m of dbMessages) {
            const role = m.sender === 'bot' ? 'model' : 'user';
            const isLastMessage = m.id === dbMessages[dbMessages.length - 1].id;
            
            let textPart = m.content ? { text: m.content } : { text: ' ' };
            const parts: any[] = [textPart];

            if (isLastMessage && m.files && m.files.length > 0) {
                parts.push(...this.buildGeminiFileParts(m.files));
            } else if (m.files && m.files.length > 0) {
                parts.push({
                  text: `[Earlier attached file(s): ${m.files.map((file) => file.name || 'attached file').join(', ')}]`,
                });
            }

            if (lastRole === role && contents.length > 0) {
                contents[contents.length - 1].parts.push(...parts);
            } else {
                contents.push({ role, parts });
            }
            lastRole = role;
          }

          const resultStream = await generativeModel.generateContentStream({ contents });

          for await (const chunk of resultStream.stream) {
            if (abortController.signal.aborted) break;
            
            const content = chunk.text() || '';
            if (content) {
              fullReply += content;
              res.write(`data: ${JSON.stringify({ token: content, conversationId: conversation.id })}\n\n`);
            }
          }

        } else {
          const openRouterMessages = dbMessages.map(m => {
            const role = m.sender === 'bot' ? 'assistant' : 'user';
            const isLastMessage = m.id === dbMessages[dbMessages.length - 1].id;
            
            if (m.sender === 'bot') {
              return { role, content: m.content || ' ' };
            }

            const hasFiles = isLastMessage && m.files && m.files.length > 0;

            if (!hasFiles) {
                return { role, content: m.content || ' ' };
            }

            const contentArray: any[] = [];
            if (m.content) {
              contentArray.push({ type: 'text', text: m.content });
            }

            for (const file of m.files!) {
              const mimeType = file.mime_type || 'application/octet-stream';
              contentArray.push({ type: 'text', text: `[Attached file: ${file.name || 'attached file'} (${mimeType})]` });

              if (mimeType.startsWith('image/') && file.data) {
                contentArray.push({
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${file.data}` }
                });
              } else {
                contentArray.push({ type: 'text', text: `[User uploaded document: ${file.name || 'attached file'}]` });
              }
            }

            return { role, content: contentArray };
          });

          const response = await this.openRouter.chat.completions.create({
            model: model,
            messages: openRouterMessages as any,
            stream: true,
            max_tokens: 2000,
          }, { signal: abortController.signal });

          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullReply += content;
              res.write(`data: ${JSON.stringify({ token: content, conversationId: conversation.id })}\n\n`);
            }
          }
        }

        if (!fullReply.trim()) return;

        const savedMsg = await this.saveMessage(conversation, fullReply, 'bot', model, userId);
        await this.usersService.logTransaction(userId, -cost, TransactionType.SPEND, `AI: ${model}`);

        res.write(`data: ${JSON.stringify({ 
            status: 'done', 
            messageId: savedMsg.id, 
            creditBalance: await this.usersService.getBalance(userId) 
        })}\n\n`);
        res.end();

      } catch (error: any) {
          if (error.name === 'AbortError') {
              this.logger.warn(`User ${userId} aborted the stream`);
              res.end();
              return; 
          }

          this.logger.error(`Stream Error: ${error.message}`);
          
          await this.usersService.addCredits(userId, cost);
          await this.usersService.logTransaction(userId, cost, TransactionType.REFUND, `Stream Error Refund: ${model}`);
          
          res.write(`data: ${JSON.stringify({ error: error.message || 'Connection lost or payload too large' })}\n\n`);
          res.end();
      }
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

  async getAiResponse(dbMessages: Message[], model: string) {
    try {
      if (model.includes('dall-e')) {
        const lastMsg = dbMessages[dbMessages.length - 1];
        const completion = await this.openRouter.images.generate({
          model: "openai/dall-e-3",
          prompt: lastMsg.content,
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

        const contents: Content[] = dbMessages.map(m => {
          const role = m.sender === 'bot' ? 'model' : 'user';
          const parts: any[] = [];
          
          if (m.content) parts.push({ text: m.content });
          
          if (m.files && m.files.length > 0) {
            parts.push(...this.buildGeminiFileParts(m.files));
          }
          
          if (parts.length === 0) parts.push({ text: ' ' });
          return { role, parts };
        });

        const result = await generativeModel.generateContent({ contents });
        return {
          reply: result.response.text() || "AI did not respond",
          tokensUsed: result.response.usageMetadata?.totalTokenCount || 0
        };
      }

      const openRouterMessages = dbMessages.map(m => {
        const role = m.sender === 'bot' ? 'assistant' : 'user';
        if (m.sender === 'bot') return { role, content: m.content || ' ' };

        const hasFiles = m.files && m.files.length > 0;

        if (!hasFiles) {
           return { role, content: m.content || ' ' };
        }

        const contentArray: any[] = [];
        if (m.content) contentArray.push({ type: 'text', text: m.content });
        
        for (const file of m.files!) {
          const mimeType = file.mime_type || 'application/octet-stream';
          contentArray.push({ type: 'text', text: `[Attached file: ${file.name || 'attached file'} (${mimeType})]` });

          if (mimeType.startsWith('image/') && file.data) {
            contentArray.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${file.data}` } });
          } else {
            contentArray.push({ type: 'text', text: `[Attached file: ${file.name || 'attached file'}]` });
          }
        }
        
        return { role, content: contentArray };
      });

      const completion = await this.openRouter.chat.completions.create({
        model,
        messages: openRouterMessages as any,
        max_tokens: 2000,
        temperature: 0.7,
      });

      return {
        reply: completion.choices[0].message.content || "AI did not respond",
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error: any) {
      this.logger.error('API Error in getAiResponse:', error.message);
      throw error;
    }
  }

  async generateVideo(prompt: string, model: string) {
    try {
      const webhookUrl = `${this.configService.get('SITE_URL')}/chat/webhook/video?secret=${this.configService.get('WEBHOOK_SECRET')}`;

      const modelTarget = model.startsWith('fal-ai/') ? model : `fal-ai/${model}`;

      const result: any = await fal.queue.submit(modelTarget, {
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
        this.logger.error("Video Generation Error:", error);
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
    await this.messageRepository.delete({ conversationId: id, userId });
    await this.conversationRepository.delete({ id, userId });
    return { success: true };
  }
}
