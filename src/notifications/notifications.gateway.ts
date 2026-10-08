import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NotificationsService } from "./notifications.service";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["https://genyxo.com", "http://localhost:3000"];

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  },
  namespace: "notifications",
  transports: ["websocket", "polling"],
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e5,
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private logger = new Logger("NotificationsGateway");

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token || client.handshake.query?.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token || typeof token !== "string") return client.disconnect();

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.sub || payload.id;

      if (userId) {
        await client.join(`user_${userId}`);
        const unreadCount = await this.notificationsService.getUnreadCount(
          Number(userId),
        );
        client.emit("unread_count_update", { count: unreadCount });
      }
    } catch (_error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug?.(`Socket ${client.id} disconnected`);
  }

  sendUnreadCount(userId: number, count: number) {
    this.server.to(`user_${userId}`).emit("unread_count_update", { count });
  }

  sendNotificationToUser(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit("new_notification", data);
  }
}
