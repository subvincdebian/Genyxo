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
import { UsersService } from "../users/users.service";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["https://genyxo.com", "http://localhost:3000", "http://localhost:3001"];

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
    private usersService: UsersService,
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

      if (
        !userId ||
        (payload.sessionVersion ?? 0) !==
          (await this.usersService.getSessionVersion(Number(userId)))
      )
        return client.disconnect();

      const sessionId = await this.usersService.trackSession(
        Number(userId),
        token,
        payload,
        client.handshake.headers["user-agent"] || "",
        client.handshake.address || "",
      );
      if (!sessionId) return client.disconnect();
      await client.join(`session_${sessionId}`);
      if (userId) {
        const [, unreadCount] = await Promise.all([
          client.join(`user_${userId}`),
          this.notificationsService.getUnreadCount(Number(userId)),
        ]);
        // Covers a revocation racing the asynchronous room join.
        if (
          (payload.sessionVersion ?? 0) !==
          (await this.usersService.getSessionVersion(Number(userId)))
        )
          return client.disconnect();
        if (
          !(await this.usersService.trackSession(
            Number(userId),
            token,
            payload,
          ))
        )
          return client.disconnect();
        client.emit("unread_count_update", { count: unreadCount });
      }
    } catch (_error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug?.(`Socket ${client.id} disconnected`);
  }

  revokeSession(id: string) {
    this.server?.in(`session_${id}`).disconnectSockets(true);
  }

  revokeSessions(userId: number) {
    this.server?.in(`user_${userId}`).disconnectSockets(true);
  }

  sendUnreadCount(userId: number, count: number) {
    this.server.to(`user_${userId}`).emit("unread_count_update", { count });
  }

  sendNotificationToUser(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit("new_notification", data);
  }
}
