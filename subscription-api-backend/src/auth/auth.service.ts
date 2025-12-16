import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.password || !(await bcrypt.compare(pass, user.password))) {
        return null; 
    }

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      if (!user.isEmailVerified) {
        throw new UnauthorizedException('Please verify your email first (check your spam folder).');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          avatar: user.avatar,
          credits: user.credits // Додаємо кредити, щоб фронт відразу їх бачив
      }
    };
  }

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findOneByEmail(createUserDto.email);
    
    if (existingUser) {
        // Якщо він зареганий через Гугл, але пробує пароль - скажемо про це
        if (existingUser.googleId) {
             throw new ConflictException('User already exists via Google. Please Login with Google.');
        }
        throw new ConflictException('User with this email already exists.');
    }

    const verificationToken = uuidv4();

    // Створюємо користувача
    const newUser = await this.usersService.create({
        ...createUserDto,
        isEmailVerified: false, 
        verificationToken: verificationToken
    });

    // Відправляємо реальний лист
    await this.emailService.sendVerificationEmail(newUser.email, verificationToken);
    
    return { message: 'Registration successful. Please check your email to verify.' };
  }

  async verifyEmail(token: string) {
    // Використовуємо новий метод сервісу замість прямого доступу до репозиторію
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) throw new BadRequestException('Invalid or expired token');

    user.isEmailVerified = true;
    user.verificationToken = null; // null тут допустимий, бо в базі це nullable
    await this.usersService.save(user); // Використовуємо метод save сервісу

    return this.login(user);
  }

  // --- OAuth Provider Login (Google) ---
  async validateOAuthLogin(profile: any, provider: 'google' | 'facebook') {
    let user = await this.usersService.findOneByEmail(profile.email);

    if (!user) {
        // Якщо юзера немає - створюємо автоматично підтвердженого
        user = await this.usersService.create({
            email: profile.email,
            name: `${profile.firstName} ${profile.lastName}`,
            avatar: profile.picture,
            isEmailVerified: true, // Довіряємо Google/FB
            password: undefined, // undefined краще ніж null для необов'язкових полів
            [`${provider}Id`]: profile.id
        });
    } else {
        // Якщо є, оновлюємо ID провайдера, якщо його ще немає
        if (!user[`${provider}Id`]) {
            user[`${provider}Id`] = profile.id;
            await this.usersService.save(user);
        }
    }
    return this.login(user);
  }
}
