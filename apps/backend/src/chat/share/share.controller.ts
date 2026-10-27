import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ShareService } from "./share.service";

/** Shared chats are public: anyone with the link can read them. */
@ApiTags("Shared chats")
@Controller("share")
export class ShareController {
  constructor(private readonly shares: ShareService) {}

  @Get(":token")
  @Header("Cache-Control", "public, max-age=60")
  view(@Param("token") token: string) {
    return this.shares.publicView(token);
  }
}
