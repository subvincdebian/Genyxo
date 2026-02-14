import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class ResolveTicketDto {
  @IsInt()
  @Min(1)
  ticketId!: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => sanitizeHtml(value))
  response!: string;
}
