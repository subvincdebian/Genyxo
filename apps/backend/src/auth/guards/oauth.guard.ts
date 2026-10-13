import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { FastifyReply } from "fastify";

// Passport's OAuth redirect uses Node's setHeader/end response API.
// The JWT guards continue to use Nest's ordinary Fastify response.
@Injectable()
export class GoogleOAuthGuard extends AuthGuard("google") {
  getResponse(context: ExecutionContext) {
    return context.switchToHttp().getResponse<FastifyReply>().raw;
  }
}

@Injectable()
export class FacebookOAuthGuard extends AuthGuard("facebook") {
  getResponse(context: ExecutionContext) {
    return context.switchToHttp().getResponse<FastifyReply>().raw;
  }
}
