import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MaxLength,
  IsArray,
  ValidateNested,
  IsNumber,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import sanitizeHtml from "sanitize-html";

export class AttachedFileDto {
  @IsString()
  @IsNotEmpty()
  mime_type!: string;

  @IsString()
  @IsOptional()
  data?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}

export class SendMessageDto {
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachedFileDto)
  files?: AttachedFileDto[];
}
