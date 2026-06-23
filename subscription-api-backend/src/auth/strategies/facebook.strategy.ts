import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { Strategy } from "passport-facebook";

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, "facebook") {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>("FACEBOOK_APP_ID")!,
      clientSecret: configService.get<string>("FACEBOOK_APP_SECRET")!,
      callbackURL: "https://genyxo.com/auth/facebook/callback",
      scope: ["email", "public_profile"],
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, result: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;

    const user = {
      email:
        emails && emails[0]
          ? emails[0].value
          : `fb.${id}@no-email.facebook.com`,

      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos && photos[0] ? photos[0].value : null,
      id: id,
    };

    const result = await this.authService.validateOAuthLogin(user, "facebook");
    done(null, result);
  }
}
