import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/user.entity'; 

// (Цей декоратор краще винести в окремий файл, але для прикладу зробимо так)
// const GetUser = createParamDecorator((data, ctx: ExecutionContext): User => {
//   const req = ctx.switchToHttp().getRequest();
//   return req.user;
// });

@Controller('profile')
export class ProfileController {
  
  @UseGuards(AuthGuard('jwt')) 
  @Get()
  getProfile(@Request() req) {
    
    const user: User = req.user;
    
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        message: 'Дані профілю успішно завантажено!'
    };
  }
}
