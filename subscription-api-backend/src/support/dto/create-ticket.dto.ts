import { IsNotEmpty, IsString, Length, IsEnum, IsOptional } from 'class-validator';
import { TicketPriority } from '../support.entity';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 100)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  message: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
