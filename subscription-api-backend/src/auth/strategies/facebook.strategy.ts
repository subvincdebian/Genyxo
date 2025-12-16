import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID')!,
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET')!,
      callbackURL: 'https://hostaisite-production.up.railway.app/auth/facebook/callback',
      scope: 'email',
      profileFields: ['emails', 'name', 'photos'],
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
      email: emails && emails[0] ? emails[0].value : null,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos && photos[0] ? photos[0].value : null,
      id: id,
    };

    // Якщо пошти немає (телефонний логін FB), треба обробляти окремо, 
    // але поки припустимо, що пошта є.
    if (!user.email) {
        return done(null, false, { message: 'Facebook account must have an email' });
    }

    const result = await this.authService.validateOAuthLogin(user, 'facebook');
    done(null, result);
  }
}
