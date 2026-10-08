import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./notification.entity";
import { NotificationsGateway } from "./notifications.gateway";
import { RedisCacheService } from "../common/redis-cache.service";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
    private readonly redisCache: RedisCacheService,
  ) {}

  async create(
    userId: number,
    title: string,
    message: string,
    type: NotificationType,
  ) {
    const notification = this.repo.create({ userId, title, message, type });
    const saved = await this.repo.save(notification);

    const cacheKey = `unread_count:${userId}`;
    const cached = await this.redisCache.get<number>(cacheKey);
    let newCount: number;
    if (cached !== null && typeof cached === "number") {
      newCount = cached + 1;
      await this.redisCache.set(cacheKey, newCount, 60);
    } else {
      newCount = await this.getUnreadCount(userId);
    }

    this.gateway.sendNotificationToUser(userId, {
      id: saved.id,
      title: saved.title,
      message: saved.message,
      type: saved.type,
      createdAt: saved.createdAt,
    });

    this.gateway.sendUnreadCount(userId, newCount);

    return saved;
  }

  async getUserNotifications(userId: number) {
    return this.repo.find({
      where: { userId },
      select: ["id", "title", "message", "type", "isRead", "createdAt"],
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    const cacheKey = `unread_count:${userId}`;
    const cached = await this.redisCache.get<number>(cacheKey);
    if (cached !== null && typeof cached === "number") {
      return cached;
    }

    const count = await this.repo.count({
      where: { userId, isRead: false },
    });

    await this.redisCache.set(cacheKey, count, 60);
    return count;
  }

  async markAsRead(id: number, userId: number) {
    const result = await this.repo.update({ id, userId, isRead: false }, { isRead: true });
    const cacheKey = `unread_count:${userId}`;
    if ((result.affected ?? 0) > 0) {
      const cached = await this.redisCache.get<number>(cacheKey);
      if (cached !== null && typeof cached === "number") {
        await this.redisCache.set(cacheKey, Math.max(0, cached - 1), 60);
      } else {
        await this.redisCache.del(cacheKey);
      }
    }
  }

  async markAllAsRead(userId: number) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    await this.redisCache.set(`unread_count:${userId}`, 0, 60);
  }
}
