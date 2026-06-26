import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class AttachedFileDto {
  @IsString()
  @IsNotEmpty()
  mime_type!: string;

  @IsString()
  @IsNotEmpty()
  data!: string; // Base64

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
  @Transform(({ value }) => value ? sanitizeHtml(value) : '')
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
  @Type (() => AttachedFileDto)
  files?: AttachedFileDto[];
}
