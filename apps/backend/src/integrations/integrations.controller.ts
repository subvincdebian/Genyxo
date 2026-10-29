import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IntegrationsService, NONCE_COOKIE } from "./integrations.service";
import { IntegrationToolsService } from "./integration-tools.service";

type AuthRequest = { user: { id: number } };

function readCookie(header: string | undefined, name: string) {
  for (const part of (header || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

@ApiTags("Integrations")
@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly tools: IntegrationToolsService,
  ) {}

  @Get()
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  catalog(@Request() req: AuthRequest) {
    return this.integrations.catalog(req.user.id);
  }

  @Post(":plugin/authorize")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  async authorize(
    @Request() req: AuthRequest,
    @Param("plugin") plugin: string,
    @Res({ passthrough: true }) reply: any,
  ) {
    const { url, nonce } = await this.integrations.authorize(
      req.user.id,
      plugin,
    );
    const secure = this.integrations.publicUrl().startsWith("https://")
      ? "; Secure"
      : "";
    // Lax lets the provider's top-level redirect carry it back to the callback.
    reply.header(
      "Set-Cookie",
      `${NONCE_COOKIE}=${nonce}; Path=/api/integrations; Max-Age=600; HttpOnly; SameSite=Lax${secure}`,
    );
    return { url };
  }

  /** Provider redirect target. Authenticated by the sealed state plus the nonce cookie. */
  @Get(":family/callback")
  async callback(
    @Param("family") family: string,
    @Query() query: Record<string, string>,
    @Req() req: any,
    @Res() reply: any,
  ) {
    // A loopback redirect (127.0.0.1) cannot see the nonce cookie set for the
    // public host, so the provider's answer is handed to the same route there.
    const publicHost = new URL(this.integrations.publicUrl()).host;
    const host = String(
      req.headers?.["x-forwarded-host"] || req.headers?.host || "",
    );
    if (host !== publicHost && /^127\.0\.0\.1(:\d+)?$/.test(host)) {
      const back = new URL(
        `/api/integrations/${encodeURIComponent(family)}/callback`,
        this.integrations.publicUrl(),
      );
      for (const [key, value] of Object.entries(query || {}))
        back.searchParams.set(key, String(value));
      return reply.redirect(back.href, HttpStatus.FOUND);
    }
    const target = new URL("/plugins", this.integrations.publicUrl());
    try {
      const plugin = await this.integrations.callback(
        family,
        query,
        readCookie(req.headers?.cookie, NONCE_COOKIE),
      );
      // Land on the plugin page, which confirms the connection.
      target.pathname = `/plugins/${encodeURIComponent(plugin)}`;
      target.searchParams.set("connected", "1");
    } catch (error: any) {
      const code = String(
        error?.response?.message || error?.message || "failed",
      );
      target.searchParams.set(
        "integrationError",
        /^[a-z_]+$/.test(code) ? code : "failed",
      );
    }
    reply.header(
      "Set-Cookie",
      `${NONCE_COOKIE}=; Path=/api/integrations; Max-Age=0; HttpOnly; SameSite=Lax`,
    );
    return reply.redirect(target.href, HttpStatus.FOUND);
  }

  @Post(":plugin/token")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  connectToken(
    @Request() req: AuthRequest,
    @Param("plugin") plugin: string,
    @Body() body: { token?: unknown; fields?: unknown },
  ) {
    return this.integrations.connectToken(req.user.id, plugin, body || {});
  }

  /** Turns on a plugin that needs no account. */
  @Post(":plugin/enable")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  enable(@Request() req: AuthRequest, @Param("plugin") plugin: string) {
    return this.integrations.enable(req.user.id, plugin);
  }

  @Patch(":plugin/settings")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  settings(
    @Request() req: AuthRequest,
    @Param("plugin") plugin: string,
    @Body() body: { policy?: unknown },
  ) {
    return this.integrations.updateSettings(req.user.id, plugin, body || {});
  }

  @Get(":plugin")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  detail(@Request() req: AuthRequest, @Param("plugin") plugin: string) {
    return this.integrations.detail(req.user.id, plugin);
  }

  @Delete(":plugin")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  disconnect(@Request() req: AuthRequest, @Param("plugin") plugin: string) {
    return this.integrations.disconnect(req.user.id, plugin);
  }

  @Get("actions/:id")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  action(@Request() req: AuthRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.tools.get(req.user.id, id);
  }

  @Post("actions/:id/confirm")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  confirm(@Request() req: AuthRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.tools.confirm(req.user.id, id);
  }

  @Post("actions/:id/cancel")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthGuard("jwt"))
  cancel(@Request() req: AuthRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.tools.cancel(req.user.id, id);
  }
}
