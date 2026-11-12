import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @IsNotEmpty({ message: "Email cannot be empty." })
  @IsEmail({}, { message: "Invalid email format." })
  @MaxLength(254, { message: "Email address is too long." })
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @IsNotEmpty({ message: "Password cannot be empty." })
  @IsString()
  password!: string;
}
