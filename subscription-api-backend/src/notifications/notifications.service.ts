import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./notification.entity";
import { NotificationsGateway } from "./notifications.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(
    userId: number,
    title: string,
    message: string,
    type: NotificationType,
  ) {
    const notification = this.repo.create({ userId, title, message, type });
    const saved = await this.repo.save(notification);

    this.gateway.sendNotificationToUser(userId, {
      id: saved.id,
      title: saved.title,
      message: saved.message,
      type: saved.type,
      createdAt: saved.createdAt,
    });

    const newCount = await this.getUnreadCount(userId);
    this.gateway.sendUnreadCount(userId, newCount);

    return saved;
  }

  async getUserNotifications(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async getUnreadCount(userId: number) {
    return this.repo.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: number, userId: number) {
    await this.repo.update({ id, userId }, { isRead: true });
  }

  async markAllAsRead(userId: number) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}
