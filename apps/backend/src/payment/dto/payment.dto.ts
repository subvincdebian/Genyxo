import { IsInt, IsNotEmpty, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BuyPackDto {
  @ApiProperty({
    example: 1,
    description: "Credit pack tier ID (1 to 6)",
    minimum: 1,
    maximum: 6,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(6)
  packId!: number;
}
