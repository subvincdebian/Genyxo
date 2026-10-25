import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class TranscribeVoiceDto {
  /** Base64 audio without a data: prefix; about 30 s of Opus fits well below the cap. */
  @IsString()
  @MinLength(16)
  @MaxLength(8_000_000)
  audio!: string;

  @IsString()
  @Matches(/^audio\/[\w.+-]+(;[\w=.,+ -]*)?$/, {
    message: "Unsupported audio type.",
  })
  mimeType!: string;

  /** Language the voice session has been in so far. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  sessionLanguage?: string;

  /** navigator.languages, most preferred first. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/, { each: true })
  locales?: string[];
}

/** Gemini's prebuilt speech voices. */
export const VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat",
] as const;

export class SpeakVoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  text!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  language?: string;

  @IsOptional()
  @IsIn(VOICES)
  voice?: string;
}

export class LiveSessionDto {
  @IsOptional()
  @IsIn(VOICES)
  voice?: string;

  /** The chat the call continues, if any. */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  conversationId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/, { each: true })
  locales?: string[];
}

export class VoiceTurnDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  conversationId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number;

  /** What the user said, as Gemini transcribed it. */
  @IsString()
  @MaxLength(8000)
  user!: string;

  /** The spoken reply's transcript plus any files, as Markdown. */
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  assistant!: string;
}
