import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../users/users.service";

export interface JwtPayload {
  email: string;
  sub: number;
  role: string;
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
          return token && token.length > 0 ? token : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOneById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("Unauthorized access");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
