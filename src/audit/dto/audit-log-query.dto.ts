import { IsOptional, IsString, IsInt } from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  status?: "SUCCESS" | "FAILURE";
}
