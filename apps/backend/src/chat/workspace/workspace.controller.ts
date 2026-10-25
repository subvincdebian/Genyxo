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
import { WorkspaceService } from "./workspace.service";
import { ChatService } from "../chat.service";

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
  ) {}
  @Get() snapshot(@Request() req: AuthRequest) {
    return this.workspace.snapshot(req.user.id);
  }
  @Get("conversations") conversations(
    @Request() req: AuthRequest,
    @Query() query: Input,
  ) {
    return this.workspace.listConversations(req.user.id, query);
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
  @Get("scheduled") scheduled(@Request() req: AuthRequest) {
    return this.workspace.listScheduled(req.user.id);
  }
  @Post("scheduled") createScheduled() {
    return this.workspace.saveScheduled();
  }
  @Patch("scheduled/:id") updateScheduled() {
    return this.workspace.saveScheduled();
  }
  @Delete("scheduled/:id") deleteScheduled() {
    return this.workspace.saveScheduled();
  }
}
