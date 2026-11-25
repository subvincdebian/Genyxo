import {
  Body,
  Controller,
  Post,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { CanvasService } from "./canvas.service";

class SelectionDto {
  @IsInt() @Min(0) start!: number;
  @IsInt() @Min(0) end!: number;
}

class CanvasEditDto {
  @IsString() @MaxLength(200_000) content!: string;
  @IsString() @MaxLength(40) language!: string;
  @IsString() @MaxLength(2000) instruction!: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => SelectionDto)
  selection?: SelectionDto;
  @IsOptional() @IsString() @MaxLength(120) model?: string;
}

class CanvasExportDto {
  @IsIn(["docx", "pdf", "pptx"]) format!: "docx" | "pdf" | "pptx";
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(400_000) content!: string;
  @IsString() @MaxLength(40) language!: string;
}

type AuthRequest = { user: { id: number } };

@ApiTags("Canvas")
@ApiBearerAuth("JWT-auth")
@UseGuards(AuthGuard("jwt"))
@Controller("chat/canvas")
export class CanvasController {
  constructor(private readonly canvas: CanvasService) {}

  /** Streams an AI rewrite of a selection or the whole document. */
  @Post("edit")
  async edit(
    @Body() dto: CanvasEditDto,
    @Request() req: AuthRequest,
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    await this.canvas.edit(req.user.id, dto, res.raw);
  }

  /** The document as a Word, PDF or PowerPoint file. */
  @Post("export")
  async export(@Body() dto: CanvasExportDto, @Res() reply: FastifyReply) {
    const file = await this.canvas.export(dto);
    return reply
      .header("Content-Type", file.mime)
      .header(
        "Content-Disposition",
        `attachment; filename="${file.name.replace(/[^\w.\- ()]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      )
      .header("Cache-Control", "no-store")
      .send(file.data);
  }
}
