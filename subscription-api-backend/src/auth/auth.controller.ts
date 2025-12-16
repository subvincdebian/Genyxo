import { Controller, Post, Body, Get, Query, UseGuards, Req, Res, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';

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
        // Помилки треба викидати через Exception класи, а не через HttpStatus
        throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res) {
    const result = await this.authService.verifyEmail(token);
    // Редірект на фронтенд з токеном
    return res.redirect(`https://genyxo.com?token=${result.access_token}&hash=#success`);
  }

  // --- Google Routes ---
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
      // Цей метод ініціює вхід через Google, тіло пусте
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // req.user містить об'єкт, який повернув authService.login()
    const token = req.user.access_token;
    // Редірект на головну сторінку з токеном
    res.redirect(`https://genyxo.com?token=${token}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {
    // Passport автоматично редіректить на Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookLoginCallback(@Req() req, @Res() res) {
    // req.user містить юзера, якого повернув validateOAuthLogin
    const result = await this.authService.login(req.user);
    
    // Редірект на фронтенд з токеном
    // Заміни https://genyxo.com на URL твого фронтенду, якщо він інший
    res.redirect(`https://genyxo.com?token=${result.access_token}`);
  }
}
