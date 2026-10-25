import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  HttpStatus,
} from "@nestjs/common";
import { FacebookOAuthGuard, GoogleOAuthGuard } from "./guards/oauth.guard";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { frontendUrl } from "../common/frontend-url";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ConfigService } from "@nestjs/config";
import { Transform } from "class-transformer";

class EmailRequestDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase().trim() : value,
  )
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get("providers")
  providers() {
    const configured = (name: string) => {
      const value = this.config.get<string>(name) || "";
      return value.length > 0 && !value.startsWith("your_");
    };
    return {
      google:
        configured("GOOGLE_CLIENT_ID") && configured("GOOGLE_CLIENT_SECRET"),
      facebook:
        configured("FACEBOOK_APP_ID") && configured("FACEBOOK_APP_SECRET"),
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Register new user account" })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  @Post("register")
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "User login with email and password" })
  @ApiResponse({ status: 200, description: "JWT access token returned" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @Post("login")
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.login(user);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("resend-verification")
  resendVerification(@Body() body: EmailRequestDto) {
    return this.authService.resendVerification(body.email);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("forgot-password")
  forgotPassword(@Body() body: EmailRequestDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("reset-password")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get("verify")
  async verify(@Query("token") token: string, @Res() res) {
    const result = await this.authService.verifyEmail(token);
    const target = frontendUrl("/sign-in");
    target.hash = `auth-token=${result.access_token}`;
    return res.redirect(target.href, HttpStatus.FOUND);
  }

  @Get("google")
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Req() _req) {}

  @Get("google/callback")
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res) {
    const token = req.user.access_token;
    const target = frontendUrl("/sign-in");
    target.hash = `auth-token=${token}`;
    return res.redirect(target.href, HttpStatus.FOUND);
  }

  @Get("facebook")
  @UseGuards(FacebookOAuthGuard)
  async facebookLogin(@Req() _req) {}

  @Get("facebook/callback")
  @UseGuards(FacebookOAuthGuard)
  async facebookLoginCallback(@Req() req, @Res() res) {
    // Both OAuth strategies return AuthService.login's token + user result.
    const target = frontendUrl("/sign-in");
    target.hash = `auth-token=${req.user.access_token}`;
    return res.redirect(target.href, HttpStatus.FOUND);
  }
}
