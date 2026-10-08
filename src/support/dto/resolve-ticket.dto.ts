import { IsNotEmpty, IsString, IsInt, Min } from "class-validator";
import { Transform } from "class-transformer";
import sanitizeHtml from "sanitize-html";

export class ResolveTicketDto {
  @IsInt()
  @Min(1)
  ticketId!: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === "string" && value.includes("<")
      ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
      : value,
  )
  response!: string;
}
