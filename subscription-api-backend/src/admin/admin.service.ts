import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import {
  Transaction,
  TransactionStatus,
} from "../transactions/transaction.entity";
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
      order: { id: "DESC" },
      relations: ["user"],
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
      order: { id: "DESC" },
      relations: ["user"],
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

  async approveTransaction(txId: number) {
    const tx = await this.transactionRepo.findOne({
      where: { id: txId },
      relations: ["user"],
    });

    if (!tx) {
      throw new NotFoundException("Transaction not found");
    }

    if (tx.status !== TransactionStatus.PENDING) {
      return { status: "error", message: "Transaction already processed" };
    }

    const user = tx.user;
    if (!user) {
      throw new NotFoundException("User associated with transaction not found");
    }

    tx.status = TransactionStatus.APPROVED;
    await this.transactionRepo.save(tx);

    user.credits = Number(user.credits) + Number(tx.creditsAmount);
    await this.userRepo.save(user);

    await this.notificationsService.create(
      user.id,
      "Payment Approved",
      `Your payment of ${tx.amount} was approved. ${tx.creditsAmount} credits added.`,
      NotificationType.SYSTEM,
    );

    return { status: "ok" };
  }
}
