import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsOptional,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateUserDto {
  @IsNotEmpty({ message: "Email cannot be empty." })
  @IsEmail({}, { message: "Invalid email format." })
  @MaxLength(254, { message: "Email address is too long." })
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @IsNotEmpty({ message: "Password cannot be empty." })
  @IsString({ message: "Password must be text." })
  @MinLength(8, { message: "Password must be at least 8 characters long." })
  @MaxLength(128, { message: "Password must be 128 characters or fewer." })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: "Name is required." })
  @MaxLength(50, { message: "Name must be 50 characters or fewer." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
