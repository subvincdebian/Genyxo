import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { SupportTicket } from "../support/support.entity";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification.entity";

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

  async manualAddCredits(userId: number, amount: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.credits = Number(user.credits) + Number(amount);
    const savedUser = await this.userRepo.save(user);

    await this.notificationsService.create(
      userId,
      "Credits Added",
      `Administrator added ${amount} credits to your account.`,
      NotificationType.SYSTEM,
    );

    return savedUser;
  }
}
