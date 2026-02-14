import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: { origin: 'https://genyxo.com' },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger('NotificationsGateway');
  private userSockets = new Map<number, string>();

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) return client.disconnect();

      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.sub || payload.id;

      if (userId) {
        this.userSockets.set(Number(userId), client.id);

        const unreadCount = await this.notificationsService.getUnreadCount(Number(userId));
        client.emit('unread_count_update', { count: unreadCount });
      }
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  sendUnreadCount(userId: number, count: number) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('unread_count_update', { count });
    }
  }

  sendNotificationToUser(userId: number, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('new_notification', data);
    }
  }
}
