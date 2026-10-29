import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID } from "crypto";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class AuthService {
  private tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

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

    const { password: _password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const sessionVersion = await this.usersService.getSessionVersion(user.id);
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      sessionVersion,
      jti: randomUUID(),
    };
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
    const { referralCode } = createUserDto;
    const [existingUser, referrer] = await Promise.all([
      this.usersService.findRegistrationConflict(createUserDto.email),
      referralCode
        ? this.usersService.findByReferralCode(referralCode)
        : Promise.resolve(null),
    ]);

    if (existingUser) {
      if (existingUser.googleId) {
        throw new ConflictException(
          "User already exists via Google. Please Login with Google.",
        );
      }
      throw new ConflictException("User with this email already exists.");
    }

    const referrerId = referrer ? referrer.id : null;

    const verificationToken = randomBytes(32).toString("hex");

    const newUser = await this.usersService.create({
      email: createUserDto.email,
      password: createUserDto.password,
      name: createUserDto.name,
      referrerId,
      isEmailVerified: false,
      verificationToken: this.tokenHash(verificationToken),
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await this.emailService.sendVerificationEmail(
        newUser.email,
        verificationToken,
      );
    } catch {
      throw new ServiceUnavailableException(
        "Account created, but the verification email could not be sent. Please request another email.",
      );
    }

    return {
      message: "Registration successful. Please check your email to verify.",
    };
  }

  async verifyEmail(token: string) {
    const user =
      (await this.usersService.findByVerificationToken(
        this.tokenHash(token),
      )) || (await this.usersService.findByVerificationToken(token));
    if (
      !user ||
      (user.verificationExpires &&
        user.verificationExpires.getTime() < Date.now())
    )
      throw new BadRequestException("Invalid or expired token");

    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await this.usersService.save(user);

    return this.login(user);
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findOneByEmail(
      email.trim().toLowerCase(),
    );
    if (user && !user.isEmailVerified) {
      const token = randomBytes(32).toString("hex");
      user.verificationToken = this.tokenHash(token);
      user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.usersService.save(user);
      await this.emailService.sendVerificationEmail(user.email, token);
    }
    return {
      message: "If this address needs verification, an email has been sent.",
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findOneByEmail(
      email.trim().toLowerCase(),
    );
    if (user?.password) {
      const token = randomBytes(32).toString("hex");
      user.resetPasswordToken = this.tokenHash(token);
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
      await this.usersService.save(user);
      await this.emailService.sendPasswordResetEmail(user.email, token);
    }
    return { message: "If an account exists, a reset link has been sent." };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersService.findByResetToken(
      this.tokenHash(token),
    );
    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    )
      throw new BadRequestException("Invalid or expired reset link");
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.usersService.save(user);
    return { message: "Password updated. You can sign in now." };
  }

  async validateOAuthLogin(
    profile: any,
    provider: "google" | "facebook",
    referralCode?: string,
  ) {
    if (!profile.email || typeof profile.email !== "string")
      throw new BadRequestException(
        "This provider did not share an email address.",
      );
    if (provider === "google" && profile.emailVerified !== true)
      throw new ForbiddenException("Google email address is not verified.");
    const email = profile.email.trim().toLowerCase();
    let user = await this.usersService.findByOAuthId(provider, profile.id);
    if (user) return this.login(user);
    user = await this.usersService.findOneByEmail(email);
    if (user)
      throw new ConflictException(
        "This email already has an account. Sign in with its original method.",
      );

    let referrerId: number | null = null;
    if (referralCode) {
      const referrer = await this.usersService.findByReferralCode(referralCode);
      referrerId = referrer ? referrer.id : null;
    }

    user = await this.usersService.create({
      email,
      name: `${profile.firstName} ${profile.lastName}`,
      avatar: profile.picture,
      isEmailVerified: true,
      referrerId,
      [`${provider}Id`]: profile.id,
    });
    return this.login(user);
  }
}
