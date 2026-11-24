import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { KnowledgeService } from "./knowledge.service";

class KnowledgeFileDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(120)
  mime_type!: string;

  @IsString()
  data!: string;
}

class KnowledgeLinkDto {
  @IsString()
  @MaxLength(2048)
  url!: string;
}

class KnowledgeDriveDto {
  @IsString()
  @MaxLength(200)
  fileId!: string;
}

class KnowledgeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;
}

type AuthRequest = { user: { id: number } };

/** A project's knowledge base: add, refresh, remove and read its sources. */
@ApiTags("Knowledge")
@ApiBearerAuth("JWT-auth")
@UseGuards(AuthGuard("jwt"))
@Controller("chat/workspace")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get("projects/:id/knowledge")
  list(@Request() req: AuthRequest, @Param("id", ParseIntPipe) id: number) {
    return this.knowledge.list(req.user.id, id);
  }

  @Get("projects/:id/knowledge/search")
  async search(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query() query: KnowledgeQueryDto,
  ) {
    return {
      items: await this.knowledge.search(req.user.id, id, query.q || "", 8),
    };
  }

  @Post("projects/:id/knowledge/files")
  addFile(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: KnowledgeFileDto,
  ) {
    return this.knowledge.addFile(req.user.id, id, dto);
  }

  @Post("projects/:id/knowledge/url")
  addUrl(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: KnowledgeLinkDto,
  ) {
    return this.knowledge.addUrl(req.user.id, id, dto.url);
  }

  @Post("projects/:id/knowledge/drive")
  addDrive(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: KnowledgeDriveDto,
  ) {
    return this.knowledge.addDrive(req.user.id, id, dto.fileId);
  }

  @Post("projects/:id/knowledge/notion")
  addNotion(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: KnowledgeLinkDto,
  ) {
    return this.knowledge.addNotion(req.user.id, id, dto.url);
  }

  @Get("knowledge/drive")
  searchDrive(@Request() req: AuthRequest, @Query() query: KnowledgeQueryDto) {
    return this.knowledge.searchDrive(req.user.id, query.q || "");
  }

  @Post("knowledge/:sourceId/refresh")
  refresh(
    @Request() req: AuthRequest,
    @Param("sourceId", ParseIntPipe) id: number,
  ) {
    return this.knowledge.refresh(req.user.id, id);
  }

  @Delete("knowledge/:sourceId")
  remove(
    @Request() req: AuthRequest,
    @Param("sourceId", ParseIntPipe) id: number,
  ) {
    return this.knowledge.remove(req.user.id, id);
  }

  @Get("knowledge/:sourceId/passage")
  passage(
    @Request() req: AuthRequest,
    @Param("sourceId", ParseIntPipe) id: number,
    @Query("chunk") chunk?: string,
  ) {
    const chunkId = Number(chunk);
    return this.knowledge.passage(
      req.user.id,
      id,
      Number.isFinite(chunkId) && chunkId > 0 ? chunkId : undefined,
    );
  }
}
