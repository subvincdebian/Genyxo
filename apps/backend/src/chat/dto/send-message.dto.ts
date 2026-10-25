import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MaxLength,
  IsArray,
  ValidateNested,
  IsNumber,
  ArrayMaxSize,
  Matches,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import sanitizeHtml from "sanitize-html";

export class AttachedFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mime_type!: string;

  @IsString()
  @IsOptional()
  data?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z\d_-]{8,64}$/)
  clientRequestId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  presetId?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  @Transform(({ value }) => {
    if (!value || typeof value !== "string") return "";
    return value.includes("<")
      ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
      : value;
  })
  message?: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  conversationId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AttachedFileDto)
  files?: AttachedFileDto[];
}
