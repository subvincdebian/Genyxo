import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }) => sanitizeHtml(value))
  message!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsInt()
  conversationId?: number;

  @IsOptional()
  @IsArray()
  files?: Array<{
    mime_type: string;
    data: string; // Строка Base64
    name?: string;
  }>;
}
