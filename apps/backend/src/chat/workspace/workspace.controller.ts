import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  PipeTransform,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches } from "class-validator";
import { WorkspaceService } from "./workspace.service";
import { ChatService } from "../chat.service";
import { ScheduledService } from "../scheduled/scheduled.service";
import { ShareService } from "../share/share.service";

class StopGenerationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  conversationId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z\d_-]{8,64}$/)
  clientRequestId?: string;
}

@Injectable()
class ObjectBodyPipe implements PipeTransform {
  transform(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new BadRequestException("A JSON object is required");
    return value;
  }
}
type Input = Record<string, any>;
type AuthRequest = { user: { id: number } };

@ApiTags("Chat Workspace")
@ApiBearerAuth("JWT-auth")
@UseGuards(AuthGuard("jwt"))
@Controller("chat/workspace")
export class WorkspaceController {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly chat: ChatService,
    private readonly scheduledTasks: ScheduledService,
    private readonly shares: ShareService,
  ) {}

  /**
   * Chats whose reply is still generating, for the sidebar shimmer, and when
   * the next scheduled task runs, so an idle page knows when to look again.
   */
  @Get("generating")
  async generating(@Request() req: AuthRequest) {
    return {
      conversationIds: this.chat.generatingConversations(req.user.id),
      nextTaskAt: await this.scheduledTasks
        .nextRunAt(req.user.id)
        .catch(() => null),
    };
  }

  /** Stop button: replies keep generating when the page is left, so stopping is explicit. */
  @Post("stop")
  stop(@Request() req: AuthRequest, @Body() body: StopGenerationDto) {
    return this.chat.stopGeneration(req.user.id, body);
  }
  @Get() snapshot(@Request() req: AuthRequest) {
    return this.workspace.snapshot(req.user.id);
  }
  @Get("conversations") conversations(
    @Request() req: AuthRequest,
    @Query() query: Input,
  ) {
    return this.workspace.listConversations(req.user.id, query);
  }
  @Get("conversations/key/:key") resolveConversationKey(
    @Request() req: AuthRequest,
    @Param("key") key: string,
  ) {
    return this.workspace.resolveConversationKey(req.user.id, key);
  }
  @Get("conversations/:id/key") conversationKey(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.conversationKey(req.user.id, id);
  }
  @Patch("conversations/:id") patchConversation(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.patchConversation(req.user.id, id, body);
  }
  @Delete("conversations/:id") deleteConversation(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteConversation(req.user.id, id);
  }
  @Post("conversations/:id/title-generation") title(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.queueTitle(req.user.id, id);
  }
  @Post("conversations/:id/preset") applyPreset(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.applyPreset(req.user.id, id, body.presetId);
  }
  @Get("projects") projects(@Request() req: AuthRequest) {
    return this.workspace.listProjects(req.user.id);
  }
  @Get("projects/:id") async project(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.serializeProject(
      await this.workspace.requireProject(req.user.id, id),
    );
  }
  @Post("projects") createProject(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.saveProject(req.user.id, body);
  }
  @Get("projects/:id/files/:fileId") getProjectFile(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("fileId") fileId: string,
  ) {
    return this.workspace.getProjectFile(req.user.id, id, fileId);
  }
  @Patch("projects/:id") updateProject(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.saveProject(req.user.id, body, id);
  }
  private async saveProject(userId: number, body: Input, id?: number) {
    await this.workspace.validateProjectInput(userId, body);
    const saved = await this.chat.saveProject(userId, body, id);
    if (body.presetId !== undefined)
      await this.workspace.patchProjectMetadata(userId, saved.id, {
        presetId: body.presetId,
      });
    return this.workspace.serializeProject(saved);
  }
  @Delete("projects/:id") deleteProject(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteProject(req.user.id, id);
  }
  @Get("memory") memory(
    @Request() req: AuthRequest,
    @Query("projectId") projectId?: string,
  ) {
    return this.workspace.listMemory(req.user.id, projectId);
  }
  @Post("memory") createMemory(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveMemory(req.user.id, body);
  }
  @Patch("memory/:id") updateMemory(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveMemory(req.user.id, body, id);
  }
  @Delete("memory/:id") deleteMemory(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteRecord(req.user.id, "memory", id);
  }
  @Get("preferences") preferences(@Request() req: AuthRequest) {
    return this.workspace.getPreferences(req.user.id);
  }
  @Patch("preferences") updatePreferences(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.savePreferences(req.user.id, body);
  }
  @Get("library") async library(
    @Request() req: AuthRequest,
    @Query() query: Input,
  ) {
    // Retain indexing of generated images/videos when entering the new route.
    await this.chat.listLibrary(req.user.id);
    await this.workspace.indexGeneratedMedia(req.user.id);
    return this.workspace.listLibrary(req.user.id, query);
  }
  @Get("library/:id") libraryItem(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.getLibraryItem(req.user.id, id);
  }
  @Post("library") createLibrary(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveLibrary(req.user.id, body);
  }
  @Patch("library/:id") updateLibrary(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveLibrary(req.user.id, body, id);
  }
  @Delete("library/:id") deleteLibrary(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteLibrary(req.user.id, id);
  }
  @Post("folders") createFolder(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveFolder(req.user.id, body);
  }
  @Patch("folders/:id") updateFolder(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveFolder(req.user.id, body, id);
  }
  @Delete("folders/:id") deleteFolder(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteRecord(req.user.id, "folder", id);
  }
  @Get("presets") presets(@Request() req: AuthRequest) {
    return this.workspace.listPresets(req.user.id);
  }
  @Post("presets") createPreset(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.savePreset(req.user.id, body);
  }
  @Patch("presets/:id") updatePreset(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.savePreset(req.user.id, body, id);
  }
  @Delete("presets/:id") deletePreset(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteRecord(req.user.id, "preset", id);
  }
  @Get("plugins") plugins(@Request() req: AuthRequest) {
    return this.workspace.listPlugins(req.user.id);
  }
  @Post("connections") createConnection(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveConnection(req.user.id, body);
  }
  @Patch("connections/:id") updateConnection(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.workspace.saveConnection(req.user.id, body, id);
  }
  @Delete("connections/:id") deleteConnection(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.workspace.deleteRecord(req.user.id, "connection", id);
  }
  @Get("scheduled") scheduled(
    @Request() req: AuthRequest,
    @Query("status") status?: string,
  ) {
    return this.scheduledTasks.list(req.user.id, status);
  }
  @Get("scheduled/:id") scheduledTask(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.scheduledTasks.get(req.user.id, id);
  }
  @Post("scheduled") async createScheduled(
    @Request() req: AuthRequest,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    const preferences = await this.workspace.getPreferences(req.user.id);
    return this.scheduledTasks.create(req.user.id, body, {
      timezone: String(preferences.timezone || "UTC"),
    });
  }
  @Patch("scheduled/:id") updateScheduled(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body(ObjectBodyPipe) body: Input,
  ) {
    return this.scheduledTasks.update(req.user.id, id, body);
  }
  @Post("scheduled/:id/run") runScheduled(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.scheduledTasks.runNow(req.user.id, id);
  }
  @Delete("scheduled/:id") deleteScheduled(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.scheduledTasks.remove(req.user.id, id);
  }

  /** Public links to a chat (Share). */
  @Get("conversations/:id/share") shareStatus(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.shares.status(req.user.id, id);
  }
  @Post("conversations/:id/share") share(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.shares.share(req.user.id, id);
  }
  @Delete("conversations/:id/share") unshare(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.shares.unshare(req.user.id, id);
  }
}
