import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../users/users.service";

export interface JwtPayload {
  email: string;
  sub: number;
  role: string;
  sessionVersion?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          const token = req?.query?.token;
          return typeof token === "string" && token.length > 0 ? token : null;
        },
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
    });
  }

  async validate(requestOrPayload: any, suppliedPayload?: JwtPayload) {
    const payload: JwtPayload = suppliedPayload || requestOrPayload;
    const request = suppliedPayload ? requestOrPayload : null;
    const user = await this.usersService.findAuthUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("Unauthorized access");
    }

    if (
      (payload.sessionVersion ?? 0) !==
      (await this.usersService.getSessionVersion(payload.sub))
    ) {
      throw new UnauthorizedException("Session expired. Please sign in again.");
    }

    let sessionId: string | undefined;
    if (request) {
      const token =
        ExtractJwt.fromAuthHeaderAsBearerToken()(request) ||
        request.query?.token;
      const tracked =
        typeof token === "string"
          ? await this.usersService.trackSession(
              user.id,
              token,
              payload,
              request.headers?.["user-agent"] || "",
              request.ip || "",
            )
          : null;
      if (!tracked)
        throw new UnauthorizedException(
          "Session revoked. Please sign in again.",
        );
      sessionId = tracked;
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      ...(sessionId ? { sessionId } : {}),
    };
  }
}
