import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  
  @IsEmail({}, { message: 'Введіть коректний Email' })
  @IsNotEmpty({ message: 'Email не може бути пустим' })
  email: string;

  @IsNotEmpty({ message: 'Пароль не може бути пустим' })
  @MinLength(6, { message: 'Пароль має бути не менше 6 символів' })
  password: string;

  @IsOptional()
  name?: string;
}
