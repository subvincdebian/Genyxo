import { IsInt, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class BuyPackDto {
  @IsInt()
  @IsNotEmpty()
  packId: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['MANUAL_CARD', 'MANUAL_CRYPTO'])
  paymentMethod: string;
}

export class AdminTransactionDto {
  @IsInt()
  @IsNotEmpty()
  txId: number;
}
