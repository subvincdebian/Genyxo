import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 100)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  message: string;
}
