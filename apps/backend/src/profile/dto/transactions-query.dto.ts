import { IsEnum, IsInt, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { TransactionType } from "../../transactions/transaction.entity";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class TransactionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @IsEnum(TransactionType)
  @ApiPropertyOptional({ enum: TransactionType })
  type?: TransactionType;
}
