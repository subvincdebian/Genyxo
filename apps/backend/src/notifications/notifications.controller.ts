import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Patch,
  Param,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { NotificationsService } from "./notifications.service";
import { ParseIntPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Notifications")
@ApiBearerAuth("JWT-auth")
@Controller("notifications")
@UseGuards(AuthGuard("jwt"))
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @ApiOperation({ summary: "Get all notifications for authenticated user" })
  @Get()
  async getAll(@Request() req) {
    return this.service.getUserNotifications(req.user.id);
  }

  @Get("unread-count")
  async getUnreadCount(@Request() req) {
    const count = await this.service.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(":id/read")
  async markRead(@Request() req, @Param("id", ParseIntPipe) id: number) {
    await this.service.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Post("read-all")
  async markAllRead(@Request() req) {
    await this.service.markAllAsRead(req.user.id);
    return { success: true };
  }
}
