import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  
  @IsEmail({}, { message: 'Please enter a valid Email.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsOptional()
  name?: string;
}
