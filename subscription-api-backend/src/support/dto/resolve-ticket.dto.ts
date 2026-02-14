import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class ResolveTicketDto {
  @IsInt()
  ticketId!: number;

  @IsString()
  @IsNotEmpty()
  response!: string;
}
