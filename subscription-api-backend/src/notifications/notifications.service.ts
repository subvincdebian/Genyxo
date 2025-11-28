import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
  ) {}

  async create(userId: number, title: string, message: string, type: NotificationType) {
    const notification = this.repo.create({
      title,
      message,
      type,
      user: { id: userId }
    });
    return this.repo.save(notification);
  }

  async getUserNotifications(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' }
    });
  }

  async getUnreadCount(userId: number) {
    return this.repo.count({
      where: { user: { id: userId }, isRead: false }
    });
  }

  async markAsRead(id: number, userId: number) {
    await this.repo.update({ id, user: { id: userId } }, { isRead: true });
  }
  
  async markAllAsRead(userId: number) {
      await this.repo.update({ user: { id: userId }, isRead: false }, { isRead: true });
  }
}
