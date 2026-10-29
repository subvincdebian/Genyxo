import {
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import sanitizeHtml from "sanitize-html";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) =>
    typeof value === "string" && value.includes("<")
      ? sanitizeHtml(value, {
          allowedTags: [],
          allowedAttributes: {},
        })
      : value,
  )
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  // Only persistent sources: an inline image or a public https URL (never blob:).
  @Matches(/^(?:$|data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/, {
    message: "Avatar must be an image data URL or an https URL.",
  })
  avatar?: string;
}
