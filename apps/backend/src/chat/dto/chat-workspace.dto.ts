import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { AttachedFileDto } from "./send-message.dto";

export class ProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instructions?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AttachedFileDto)
  files?: AttachedFileDto[];
}

export class AlternativeDto {
  @IsInt()
  @Type(() => Number)
  messageId!: number;

  @IsString()
  model!: string;
}

export class SaveLibraryItemDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsIn(["document"])
  type!: "document";

  @IsString()
  @MaxLength(100_000)
  content!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sourceMessageId?: number;
}
