import { IsInt, IsNotEmpty } from "class-validator";

export class BuyPackDto {
  @IsInt()
  @IsNotEmpty()
  packId!: number;
}
