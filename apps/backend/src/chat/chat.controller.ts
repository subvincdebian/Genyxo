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
  Query,
  Res,
  Optional,
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
import { countryFromHeaders } from "./language/language-profile.service";
import {
  AlternativeDto,
  ProjectDto,
  SaveLibraryItemDto,
} from "./dto/chat-workspace.dto";
import * as crypto from "crypto";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { WorkspaceService } from "./workspace/workspace.service";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private falService: FalService,
    private pricingService: PricingService,
    private configService: ConfigService,
    @Optional() private workspaceService?: WorkspaceService,
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
  @Get("projects")
  listProjects(@Request() req) {
    return this.chatService.listProjects(req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("projects")
  createProject(@Body() dto: ProjectDto, @Request() req) {
    return this.chatService.saveProject(req.user.id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("projects/:id")
  updateProject(
    @Param("id") id: number,
    @Body() dto: ProjectDto,
    @Request() req,
  ) {
    return this.chatService.saveProject(req.user.id, dto, Number(id));
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("projects/:id")
  deleteProject(@Param("id") id: number, @Request() req) {
    return this.chatService.deleteProject(req.user.id, Number(id));
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("conversations/:id/project")
  setConversationProject(
    @Param("id") id: number,
    @Body("projectId") projectId: number | null,
    @Request() req,
  ) {
    return this.chatService.setConversationProject(
      req.user.id,
      Number(id),
      projectId ? Number(projectId) : null,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("alternative")
  alternative(@Body() dto: AlternativeDto, @Request() req) {
    return this.chatService.generateAlternative(
      req.user.id,
      dto.messageId,
      dto.model,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("library")
  listLibrary(@Request() req) {
    return this.chatService.listLibrary(req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("library/document/:id")
  getLibraryDocument(@Param("id") id: number, @Request() req) {
    return this.chatService.getLibraryDocument(req.user.id, Number(id));
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("library")
  saveLibraryItem(@Body() dto: SaveLibraryItemDto, @Request() req) {
    return this.chatService.saveDocumentToLibrary(req.user.id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("library/:id")
  deleteLibraryItem(@Param("id") id: number, @Request() req) {
    return this.chatService.deleteLibraryItem(req.user.id, Number(id));
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("stream")
  async streamMessage(
    @Body() dto: StreamMessageDto,
    @Request() req,
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    const userId = req.user.id;
    const {
      message,
      model,
      conversationId,
      projectId,
      files,
      presetId,
      clientRequestId,
    } = dto;
    const selectedModel = model || "google/gemini-3.5-flash-lite";
    const convId = conversationId ? Number(conversationId) : undefined;

    const modelConfig = this.pricingService.getModelConfig(selectedModel);
    if (!modelConfig)
      throw new BadRequestException(`Model ${selectedModel} not supported`);

    if (!message?.trim() && !files?.length)
      throw new BadRequestException("Message or files must be provided");
    await this.workspaceService?.validateChatInput(userId, dto);
    const claimed = clientRequestId
      ? await this.workspaceService?.claimRequest(userId, clientRequestId, dto)
      : null;
    if (claimed?.replay) {
      const result = claimed.replay;
      res.raw.setHeader("Content-Type", "text/event-stream");
      res.raw.setHeader("Cache-Control", "no-cache, no-transform");
      for (const event of [
        { status: "conversation", conversationId: result.conversationId },
        { token: result.botReply, conversationId: result.conversationId },
        {
          status: "done",
          messageId: result.messageId,
          creditBalance: result.creditsLeft,
        },
      ])
        res.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      res.raw.end();
      return;
    }

    const cost = modelConfig.cost;
    const isDeducted = await this.usersService.deductCredits(userId, cost);
    if (!isDeducted) {
      await this.workspaceService?.failRequest(userId, clientRequestId);
      throw new ForbiddenException("Not enough credits");
    }

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
      projectId,
      presetId,
      clientRequestId,
      {
        voice: dto.voice,
        language: dto.language,
        locales: dto.locales,
        country: countryFromHeaders(req.headers || {}),
        location: dto.location,
        pinnedPlaces: dto.pinnedPlaces,
        mode: dto.mode,
      },
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("message")
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    const userId = req.user.id;
    const {
      message,
      conversationId,
      projectId,
      model,
      files,
      presetId,
      clientRequestId,
    } = dto;

    const modelConfig = this.pricingService.getModelConfig(model);
    if (!modelConfig)
      throw new BadRequestException(`Model ${model} not supported`);

    const cost = modelConfig.cost;
    if (!message?.trim() && (!files || files.length === 0)) {
      throw new BadRequestException("Message or files must be provided");
    }

    await this.workspaceService?.validateChatInput(userId, dto);
    const claimed = clientRequestId
      ? await this.workspaceService?.claimRequest(userId, clientRequestId, dto)
      : null;
    if (claimed?.replay) return claimed.replay;

    const isDeducted = await this.usersService.deductCredits(userId, cost);
    if (!isDeducted) {
      await this.workspaceService?.failRequest(userId, clientRequestId);
      throw new ForbiddenException(`Not enough credits.`);
    }

    try {
      const result = await this.chatService.processMessage(
        userId,
        message || "",
        model,
        conversationId,
        files || [],
        cost,
        projectId,
        presetId,
        clientRequestId,
      );

      await this.workspaceService?.completeRequest(
        userId,
        clientRequestId,
        result,
      );

      return result;
    } catch (_error) {
      await this.workspaceService?.failRequest(userId, clientRequestId);
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
    @Headers("x-webhook-secret") headerSecret?: string,
    @Query("secret") querySecret?: unknown,
  ) {
    // FAL returns to the configured URL and does not add our custom header.
    const secret =
      headerSecret ??
      (typeof querySecret === "string" ? querySecret : undefined);
    const configSecret = this.configService.get<string>("WEBHOOK_SECRET");

    if (!secret || !configSecret) {
      throw new ForbiddenException("Invalid webhook secret");
    }
    const supplied = Buffer.from(secret);
    const expected = Buffer.from(configSecret);
    if (supplied.length !== expected.length) {
      throw new ForbiddenException("Invalid webhook secret");
    }
    const isMatch = crypto.timingSafeEqual(supplied, expected);
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
