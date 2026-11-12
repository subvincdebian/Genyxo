import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SendMessageDto } from "./send-message.dto";

const LANGUAGE_TAG = /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Where the user is, shared on the Maps page for nearby questions. */
export class SharedLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  accuracy?: number;
}

/** A place the user picked on the map and mentioned with "@". */
export class PinnedPlaceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

export class StreamMessageDto extends SendMessageDto {
  /** The message was spoken in voice mode, so the reply is read aloud. */
  @IsOptional()
  @IsBoolean()
  voice?: boolean;

  /** Language the speech was recognised in. */
  @IsOptional()
  @IsString()
  @Matches(LANGUAGE_TAG)
  language?: string;

  /** navigator.languages, most preferred first. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(LANGUAGE_TAG, { each: true })
  locales?: string[];

  /** Shared on the Maps page: enables the built-in map tools for this turn. */
  @IsOptional()
  @ValidateNested()
  @Type(() => SharedLocationDto)
  location?: SharedLocationDto;

  /** "+" menu modes: always search the web, or run Deep research. */
  @IsOptional()
  @IsIn(["search", "research"])
  mode?: "search" | "research";

  /** Map places mentioned in the message, with their address and coordinates. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PinnedPlaceDto)
  pinnedPlaces?: PinnedPlaceDto[];
}
