import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { Index } from 'typeorm';

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
}
