import { IsString, IsOptional, Length } from "class-validator";
import { Transform } from "class-transformer";
import sanitizeHtml from "sanitize-html";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) =>
    sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }),
  )
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
