import { IsInt, Min } from "class-validator";

export class AdminTransactionActionDto {
  @IsInt()
  @Min(1)
  txId!: number;
}
