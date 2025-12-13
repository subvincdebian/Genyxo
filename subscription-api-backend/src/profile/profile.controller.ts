import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
    user: { id: number, email: string, name: string };
}

@Controller('profile')
export class ProfileController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getProfile(@Request() req) {

    const userId = req.user.id;

    const user = await this.usersService.findOneById(userId);
    
    if (!user) {
        return { error: 'User not found' };
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        credits: user.credits,
        avatar: user.avatar
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('update')
  async updateProfile(@Request() req, @Body() body: { name?: string, avatar?: string }) {
    await this.usersService.updateUser(req.user.id, body);
    return { status: 'success' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('affiliate')
  async getAffiliateInfo(@Request() req) {
    const userId = req.user.id;
    return this.usersService.getAffiliateStats(userId);
  }
}
