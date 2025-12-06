import { IsNotEmpty, IsString, Length, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { TicketPriority } from '../support.entity';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 100)
  @Transform(({ value }) => sanitizeHtml(value))
  subject: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  @Transform(({ value }) => sanitizeHtml(value))
  message: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
