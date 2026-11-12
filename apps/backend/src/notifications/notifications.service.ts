import { Injectable, Inject, Optional, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./notification.entity";
import { NotificationsGateway } from "./notifications.gateway";
import { RedisCacheService } from "../common/redis-cache.service";
import { EmailService } from "../email/email.service";
import {
  mergeNotificationPreferences,
  type NotificationCategory,
} from "./notification-preferences";

export type NotifyInput = {
  category: NotificationCategory;
  title: string;
  message: string;
  type?: NotificationType;
  /** Site path opened from the push notification or email. */
  link?: string;
  /** Email button label. */
  action?: string;
  /** false when the caller sends its own, richer email. */
  email?: boolean;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
    private readonly redisCache: RedisCacheService,
    @Optional() private readonly email?: EmailService,
  ) {}

  /** The person's channel choice for a category (defaults when never saved). */
  async preferences(userId: number, category: NotificationCategory) {
    try {
      const rows = await this.repo.manager.query(
        "SELECT settings FROM user_interaction_settings WHERE userId = ?",
        [userId],
      );
      const raw = rows[0]?.settings;
      const settings = typeof raw === "string" ? JSON.parse(raw) : raw || {};
      return mergeNotificationPreferences(settings.notifications).categories[
        category
      ];
    } catch {
      return mergeNotificationPreferences(null).categories[category];
    }
  }

  async wantsEmail(userId: number, category: NotificationCategory) {
    return (await this.preferences(userId, category)).email;
  }

  /**
   * Record an in-app notification, push it to open tabs (which show a system
   * notification when the person enabled push) and email it when enabled.
   */
  async notify(userId: number, input: NotifyInput) {
    const choice = await this.preferences(userId, input.category);
    const saved = await this.create(
      userId,
      input.title,
      input.message,
      input.type || NotificationType.INFO,
      { category: input.category, link: input.link, push: choice.push },
    );
    if (choice.email && input.email !== false && this.email) {
      const user = await this.repo.manager.query(
        "SELECT email, name FROM users WHERE id = ?",
        [userId],
      );
      if (user[0]?.email)
        void this.email.sendNotificationEmail({
          email: user[0].email,
          name: user[0].name,
          title: input.title,
          message: input.message,
          link: input.link,
          action: input.action,
        });
    }
    return saved;
  }

  async create(
    userId: number,
    title: string,
    message: string,
    type: NotificationType,
    delivery: { category?: string; link?: string; push?: boolean } = {},
  ) {
    const notification = this.repo.create({ userId, title, message, type });
    const cacheKey = `unread_count:${userId}`;
    const [saved, cached] = await Promise.all([
      this.repo.save(notification),
      this.redisCache.get<number>(cacheKey),
    ]);

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
      ...delivery,
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
    const result = await this.repo.update(
      { id, userId, isRead: false },
      { isRead: true },
    );
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
