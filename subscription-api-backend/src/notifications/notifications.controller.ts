import { Controller, Get, Post, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  async getAll(@Request() req) {
    return this.service.getUserNotifications(req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.service.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Request() req, @Param('id') id: number) {
    await this.service.markAsRead(id, req.user.id);
    return { success: true };
  }
  
  @Post('read-all')
  async markAllRead(@Request() req) {
      await this.service.markAllAsRead(req.user.id);
      return { success: true };
  }
}
