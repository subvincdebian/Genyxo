import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  
  @IsEmail({}, { message: 'Please enter a valid Email.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsOptional()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Referrer ID must be a number.' })
  @IsInt({ message: 'Referrer ID must be an integer.' })
  referrerId?: number;
}
