import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: 'https://genyxo.com/auth/google/callback', 
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos, id } = profile;
    const userEmail = (emails && emails.length > 0) 
        ? emails[0].value 
        : `google.${id}@no-email.genyxo.com`;
    const user = {
      email: userEmail,
      firstName: name.givenName || 'User',
      lastName: name.familyName || ':)',
      picture: (photos && photos.length > 0) ? photos[0].value : null,
      id: id
    };
    
    const result = await this.authService.validateOAuthLogin(user, 'google');
    done(null, result);
  }
}
