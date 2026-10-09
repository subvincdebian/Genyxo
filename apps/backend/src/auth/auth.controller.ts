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

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Get("verify")
  async verify(@Query("token") token: string, @Res() res) {
    const result = await this.authService.verifyEmail(token);
    const target = frontendUrl();
    target.searchParams.set("token", result.access_token);
    return res.redirect(target.href, HttpStatus.FOUND);
  }

  @Get("google")
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Req() req) {}

  @Get("google/callback")
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res) {
    const token = req.user.access_token;
    const target = frontendUrl();
    target.searchParams.set("token", token);
    return res.redirect(target.href, HttpStatus.FOUND);
  }

  @Get("facebook")
  @UseGuards(FacebookOAuthGuard)
  async facebookLogin(@Req() req) {}

  @Get("facebook/callback")
  @UseGuards(FacebookOAuthGuard)
  async facebookLoginCallback(@Req() req, @Res() res) {
    // Both OAuth strategies return AuthService.login's token + user result.
    const target = frontendUrl();
    target.searchParams.set("token", req.user.access_token);
    return res.redirect(target.href, HttpStatus.FOUND);
  }
}
