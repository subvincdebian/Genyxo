import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @IsNotEmpty({ message: "Email cannot be empty." })
  @IsEmail({}, { message: "Invalid email format." })
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @IsNotEmpty({ message: "Password cannot be empty." })
  @IsString()
  password!: string;
}
