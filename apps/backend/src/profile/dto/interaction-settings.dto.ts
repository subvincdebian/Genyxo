import { IsBoolean, IsIn, IsObject, IsOptional } from "class-validator";
import { VOICES } from "../../chat/voice/voice.dto";

export const CALL_LANGUAGES = [
  "auto",
  "en",
  "uk",
  "es",
  "de",
  "fr",
  "it",
  "pt",
  "pl",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
  "tr",
  "nl",
  "sv",
  "cs",
  "ro",
  "id",
  "vi",
];
export class InteractionSettingsDto {
  @IsOptional() @IsIn(VOICES) voice?: string;
  @IsOptional() @IsIn(CALL_LANGUAGES) callLanguage?: string;
  @IsOptional() @IsBoolean() dictationEnabled?: boolean;
  @IsOptional() @IsObject() shortcuts?: Record<
    string,
    { binding: string; enabled: boolean }
  >;
  @IsOptional() @IsObject() notifications?: {
    categories?: Record<string, { push?: boolean; email?: boolean }>;
    sound?: boolean;
  };
}
