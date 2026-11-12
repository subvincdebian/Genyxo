import { IsIn, IsInt, IsNotEmpty, IsOptional, Min, Max } from "class-validator";
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

  @ApiProperty({
    required: false,
    enum: ["crypto", "card"],
    description:
      "How the buyer intends to pay. Cards run through the NOWPayments fiat on-ramp.",
  })
  @IsOptional()
  @IsIn(["crypto", "card"])
  method?: "crypto" | "card";
}
