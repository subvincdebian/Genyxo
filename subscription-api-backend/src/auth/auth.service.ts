import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.password) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    if (!user.isEmailVerified) {
      throw new UnauthorizedException("Please verify your email first.");
    }

    const { password, ...result } = user;
    return result;
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
        credits: user.credits,
        role: user.role,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    const { referralCode, ...userData } = createUserDto;
    const existingUser = await this.usersService.findOneByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      if (existingUser.googleId) {
        throw new ConflictException(
          "User already exists via Google. Please Login with Google.",
        );
      }
      throw new ConflictException("User with this email already exists.");
    }

    let referrerId: number | null = null;
    if (referralCode) {
      const referrer = await this.usersService.findByReferralCode(referralCode);
      referrerId = referrer ? referrer.id : null;
    }

    const verificationToken = randomUUID();

    const newUser = await this.usersService.create({
      ...createUserDto,
      referrerId,
      isEmailVerified: false,
      verificationToken: verificationToken,
    });

    await this.emailService.sendVerificationEmail(
      newUser.email,
      verificationToken,
    );

    return {
      message: "Registration successful. Please check your email to verify.",
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) throw new BadRequestException("Invalid or expired token");

    user.isEmailVerified = true;
    user.verificationToken = null;
    await this.usersService.save(user);

    return this.login(user);
  }

  async validateOAuthLogin(
    profile: any,
    provider: "google" | "facebook",
    referralCode?: string,
  ) {
    let user = await this.usersService.findOneByEmail(profile.email);

    if (!user) {
      let referrerId: number | null = null;
      if (referralCode) {
        const referrer =
          await this.usersService.findByReferralCode(referralCode);
        referrerId = referrer ? referrer.id : null;
      }

      user = await this.usersService.create({
        email: profile.email,
        name: `${profile.firstName} ${profile.lastName}`,
        avatar: profile.picture,
        isEmailVerified: true,
        referrerId,
        [`${provider}Id`]: profile.id,
      });
    } else {
      if (!user[`${provider}Id`]) {
        user[`${provider}Id`] = profile.id;
        await this.usersService.save(user);
      }
    }
    return this.login(user);
  }
}
