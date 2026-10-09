import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { SupportTicket } from "../support/support.entity";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification.entity";
import { RedisCacheService } from "../common/redis-cache.service";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(SupportTicket)
    private ticketRepo: Repository<SupportTicket>,
    private readonly notificationsService: NotificationsService,
    private readonly redisCache: RedisCacheService,
    private readonly auditService: AuditService,
  ) {}

  async getAllUsers(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.userRepo.findAndCount({
      select: ["id", "email", "name", "role", "credits"],
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getAllTransactions(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 20 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionRepo.findAndCount({
      relations: {
        user: true,
      },
      select: {
        id: true,
        amount: true,
        creditsAmount: true,
        status: true,
        type: true,
        provider: true,
        createdAt: true,
        userId: true,
        description: true,
        user: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getAllTickets(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.ticketRepo.findAndCount({
      relations: {
        user: true,
      },
      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        priority: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async manualAddCredits(userId: number, amount: number, actorId?: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ["id", "credits"],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const previousCredits = Number(user.credits || 0);
    const creditsToAdd = Number(amount);
    if (!isNaN(creditsToAdd) && creditsToAdd > 0) {
      await Promise.all([
        this.userRepo.increment({ id: userId }, "credits", creditsToAdd),
        this.notificationsService.create(
          userId,
          "Credits Added",
          `Administrator added ${amount} credits to your account.`,
          NotificationType.SYSTEM,
        ),
      ]);
      user.credits = previousCredits + creditsToAdd;
      await this.redisCache.invalidate(userId);
    } else {
      await this.notificationsService.create(
        userId,
        "Credits Added",
        `Administrator added ${amount} credits to your account.`,
        NotificationType.SYSTEM,
      );
    }

    await this.auditService.record({
      action: AuditAction.CREDITS_MANUAL_ADD,
      actorId: actorId ?? null,
      userId,
      resource: "users",
      resourceId: String(userId),
      oldValues: { credits: previousCredits },
      newValues: { credits: user.credits },
      metadata: { amount: creditsToAdd },
    });

    return user;
  }
}
