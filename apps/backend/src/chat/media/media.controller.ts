import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MediaService } from "./media.service";

const INLINE_TYPES =
  /^(image\/(png|jpeg|webp|gif)|audio\/(wav|x-wav|mpeg|mp3|ogg|webm|aac|mp4)|video\/(mp4|webm|quicktime))$/;

/**
 * Generated media by unguessable id, so <img>, <audio> and <video> tags can
 * load it without a bearer token (the id is the capability).
 */
@ApiTags("Chat media")
@Controller("chat/media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get(":id/status")
  status(@Param("id", ParseUUIDPipe) id: string) {
    return this.media.status(id);
  }

  @Get(":id")
  async file(@Param("id", ParseUUIDPipe) id: string, @Res() reply: any) {
    const file = await this.media.file(id);
    const inline = INLINE_TYPES.test(file.mimeType);
    return reply
      .header(
        "Content-Type",
        inline ? file.mimeType : "application/octet-stream",
      )
      .header("Content-Disposition", inline ? "inline" : "attachment")
      .header("Cache-Control", "private, max-age=31536000, immutable")
      .header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox")
      .send(file.data);
  }
}
