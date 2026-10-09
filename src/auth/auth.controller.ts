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
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { frontendUrl } from "../common/frontend-url";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("register")
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Req() req) {}

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const token = req.user.access_token;
    const target = frontendUrl();
    target.searchParams.set("token", token);
    return res.redirect(target.href, HttpStatus.FOUND);
  }

  @Get("facebook")
  @UseGuards(AuthGuard("facebook"))
  async facebookLogin(@Req() req) {}

  @Get("facebook/callback")
  @UseGuards(AuthGuard("facebook"))
  async facebookLoginCallback(@Req() req, @Res() res) {
    // Both OAuth strategies return AuthService.login's token + user result.
    const target = frontendUrl();
    target.searchParams.set("token", req.user.access_token);
    return res.redirect(target.href, HttpStatus.FOUND);
  }
}
