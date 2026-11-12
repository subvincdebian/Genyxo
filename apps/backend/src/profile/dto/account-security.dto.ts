import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({ minLength: 1, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 128,
    writeOnly: true,
    description: "At most 72 UTF-8 bytes (bcrypt limit).",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
