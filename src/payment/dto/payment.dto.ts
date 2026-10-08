import { IsInt, IsNotEmpty, Min, Max } from "class-validator";

export class BuyPackDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(6)
  packId!: number;
}
