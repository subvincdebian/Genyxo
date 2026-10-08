import { IsInt, Min } from 'class-validator';

export class AdminAddCreditsDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsInt()
  @Min(1)
  amount!: number;
}
