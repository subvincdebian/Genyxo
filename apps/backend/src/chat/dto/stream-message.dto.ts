import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import { SendMessageDto } from "./send-message.dto";

const LANGUAGE_TAG = /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

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
}
