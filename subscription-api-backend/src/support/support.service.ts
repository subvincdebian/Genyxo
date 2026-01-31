import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus, TicketPriority } from './support.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepo: Repository<SupportTicket>,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async create(userId: number, subject: string, message: string, priority?: TicketPriority) {
    const ticket = this.ticketRepo.create({
      subject,
      message,
      priority: priority || TicketPriority.MEDIUM,
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

  async getAllTickets(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.ticketRepo.findAndCount({
      relations: ['user'],
      order: { 
        status: 'ASC', 
        priority: 'DESC', 
        createdAt: 'DESC' 
      },
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      }
    };
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

    await this.ticketRepo.save(ticket);

    await this.notificationsService.create(
        ticket.user.id,
        'Support Reply 📩',
        `Support team has replied to your ticket "${ticket.subject}".`,
        NotificationType.SUPPORT
    );

    if (ticket.user.email) {
        await this.emailService.sendSupportReply(
            ticket.user.email,
            ticket.user.name || 'User',
            ticket.subject,
            response
        );
    }
    
    return ticket;
  }
}
