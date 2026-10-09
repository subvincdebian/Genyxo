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
  Headers,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { SkipThrottle } from "@nestjs/throttler";
import { TransactionType } from "../transactions/transaction.entity";
import { UsersService } from "../users/users.service";
import { ChatService } from "./chat.service";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { StreamMessageDto } from "./dto/stream-message.dto";
import * as crypto from "crypto";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private falService: FalService,
    private pricingService: PricingService,
    private configService: ConfigService,
  ) {}

  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  @ApiOperation({ summary: "Get all conversations for user" })
  @Get("conversations")
  async getConversations(@Request() req) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("history/:id")
  async getChatHistory(@Param("id") id: number, @Request() req) {
    return this.chatService.getConversationMessages(req.user.id, id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("stream")
  async streamMessage(
    @Body() dto: StreamMessageDto,
    @Request() req,
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    const userId = req.user.id;
    const { message, model, conversationId, files } = dto;
    const selectedModel = model || "openai/gpt-4o-mini";
    const convId = conversationId ? Number(conversationId) : undefined;

    const modelConfig = this.pricingService.getModelConfig(selectedModel);
    if (!modelConfig)
      throw new BadRequestException(`Model ${selectedModel} not supported`);

    const cost = modelConfig.cost;
    const isDeducted = await this.usersService.deductCredits(userId, cost);
    if (!isDeducted) throw new ForbiddenException("Not enough credits");

    const raw = res.raw;
    raw.setHeader("Content-Type", "text/event-stream");
    raw.setHeader("Cache-Control", "no-cache, no-transform");
    raw.setHeader("Connection", "keep-alive");
    raw.setHeader("X-Accel-Buffering", "no");
    if (typeof raw.flushHeaders === "function") {
      raw.flushHeaders();
    }

    await this.chatService.processStreamingMessage(
      userId,
      message || "",
      selectedModel,
      convId,
      cost,
      files || [],
      raw,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("message")
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    const userId = req.user.id;
    const { message, conversationId, model, files } = dto;

    const modelConfig = this.pricingService.getModelConfig(model);
    if (!modelConfig)
      throw new BadRequestException(`Model ${model} not supported`);

    const cost = modelConfig.cost;
    if (!message?.trim() && (!files || files.length === 0)) {
      throw new BadRequestException("Message or files must be provided");
    }

    const isDeducted = await this.usersService.deductCredits(userId, cost);
    if (!isDeducted) throw new ForbiddenException(`Not enough credits.`);

    try {
      const result = await this.chatService.processMessage(
        userId,
        message || "",
        model,
        conversationId,
        files || [],
        cost,
      );

      return result;
    } catch (error) {
      await Promise.all([
        this.usersService.addCredits(userId, cost),
        this.usersService.logTransaction(
          userId,
          cost,
          TransactionType.REFUND,
          `Refund for failed ${model} request`,
        ),
      ]);
      throw new InternalServerErrorException(
        "The AI service is temporarily unavailable.",
      );
    }
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch(["conversation/:id", "conversations/:id"])
  async rename(
    @Param("id") id: number,
    @Body("title") title: string,
    @Request() req,
  ) {
    return this.chatService.renameConversation(req.user.id, id, title);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete(["conversation/:id", "conversations/:id"])
  async delete(@Param("id") id: number, @Request() req) {
    await this.chatService.deleteConversation(req.user.id, id);
    return { success: true };
  }

  @SkipThrottle()
  @Post("webhook/video")
  async handleFalWebhook(
    @Body() data: any,
    @Headers("x-webhook-secret") secret: string,
  ) {
    const configSecret = this.configService.get<string>("WEBHOOK_SECRET");

    if (!secret || !configSecret || secret.length !== configSecret.length) {
      throw new ForbiddenException("Invalid webhook secret");
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(configSecret),
    );
    if (!isMatch) throw new ForbiddenException("Invalid webhook secret");

    const { request_id, status, payload } = data;
    if (status === "COMPLETED" && payload?.video?.url) {
      await this.chatService.updateVideoUrl(request_id, payload.video.url);
    } else if (status === "ERROR") {
      await this.chatService.updateVideoUrl(
        request_id,
        "ERROR: Generation failed",
      );
    }
    return { status: "ok" };
  }

  @SkipThrottle()
  @UseGuards(AuthGuard("jwt"))
  @Get("message-status/:id")
  async getMessageStatus(@Param("id") id: number, @Request() req) {
    const message = await this.chatService.getMessageById(id);
    if (!message || message.userId !== req.user.id)
      throw new NotFoundException("Message not found");

    const isError = message.content.startsWith("ERROR:");
    const isReady = message.content.startsWith("http") || isError;

    return {
      isReady,
      isError,
      videoUrl: message.content.startsWith("http") ? message.content : null,
      errorDetails: isError ? message.content : null,
    };
  }
}
