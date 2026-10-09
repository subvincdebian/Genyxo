import { IsString, IsOptional, Length, MaxLength } from "class-validator";
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
  @MaxLength(300_000)
  avatar?: string;
}
