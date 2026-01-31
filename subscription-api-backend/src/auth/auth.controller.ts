import { Controller, Post, Body, Get, Query, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() body) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
        throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res) {
    const result = await this.authService.verifyEmail(token);
    return res.redirect(`https://genyxo.com?token=${result.access_token}&hash=#success`);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const token = req.user.access_token;
    res.redirect(`https://genyxo.com?token=${token}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin(@Req() req) {
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookLoginCallback(@Req() req, @Res() res) {
    const result = await this.authService.login(req.user);
    res.redirect(`https://genyxo.com?token=${result.access_token}`);
  }
}
