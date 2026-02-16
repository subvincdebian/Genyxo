import { IsEmail, IsNotEmpty, MinLength, Matches, IsString, IsOptional, IsInt, IsNumber, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateUserDto {
  
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email!: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { 
        message: 'Password must contain uppercase, lowercase letters and numbers' 
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  @Transform(({ value }) => value.trim())
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
