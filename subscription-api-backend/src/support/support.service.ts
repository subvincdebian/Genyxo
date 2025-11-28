import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from './support.entity';

import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepo: Repository<SupportTicket>,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: number, subject: string, message: string) {
    const ticket = this.ticketRepo.create({
      subject,
      message,
      user: { id: userId },
    });
    return this.ticketRepo.save(ticket);
  }

  async getUserTickets(userId: number) {
    return this.ticketRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  // --- АДМІН ЧАСТИНА ---

  async getAllTickets() {
    return this.ticketRepo.find({
      relations: ['user'],
      order: { status: 'ASC', createdAt: 'DESC' },
    });
  }

  async resolveTicket(ticketId: number, response: string) {

    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    ticket.adminResponse = response;
    ticket.status = TicketStatus.CLOSED;

    await this.notificationsService.create(
        ticket.user.id,
        'Support Reply 📩',
        `Support team has replied to your ticket "${ticket.subject}". Check "Support" page.`,
        NotificationType.SUPPORT
    );
    
    return this.ticketRepo.save(ticket);
  }
}
