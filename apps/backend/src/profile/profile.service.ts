import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../users/user.entity";
import { UsersService } from "../users/users.service";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../transactions/transaction.entity";
import { summarizeUsage } from "./profile-usage";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly userService: UsersService,
    private readonly notifications: NotificationsGateway,
  ) {}

  async security(userId: number) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: ["id", "password", "isEmailVerified", "googleId", "facebookId"],
    });
    if (!user) throw new UnauthorizedException();
    return {
      hasPassword: Boolean(user.password),
      emailVerified: user.isEmailVerified,
      providers: [
        user.googleId ? "Google" : null,
        user.facebookId ? "Facebook" : null,
      ].filter(Boolean),
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    if (Buffer.byteLength(newPassword, "utf8") > 72)
      throw new BadRequestException(
        "New password must be at most 72 UTF-8 bytes.",
      );
    // Lock the account so concurrent changes cannot both accept an old password.
    await this.users.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        select: ["id", "password"],
        lock: { mode: "pessimistic_write" },
      });
      if (
        !user?.password ||
        !(await bcrypt.compare(currentPassword, user.password))
      )
        throw new BadRequestException("Current password is incorrect.");
      if (await bcrypt.compare(newPassword, user.password))
        throw new BadRequestException("Choose a different password.");
      await manager.update(User, userId, {
        password: await bcrypt.hash(newPassword, 12),
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });
      await manager.increment(User, { id: userId }, "sessionVersion", 1);
    });
    await this.userService.invalidateUserCache(userId);
    this.notifications.revokeSessions(userId);
    return { status: "success" };
  }

  async revokeSessions(userId: number) {
    await this.users.increment({ id: userId }, "sessionVersion", 1);
    await this.userService.invalidateUserCache(userId);
    this.notifications.revokeSessions(userId);
    return { status: "success" };
  }

  async usage(userId: number, period = 30) {
    if (![7, 30, 90].includes(period))
      throw new BadRequestException("Period must be 7, 30 or 90 days.");
    const end = new Date();
    const start = new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate() - period + 1,
      ),
    );
    const base = () =>
      this.transactions
        .createQueryBuilder("t")
        .where("t.userId = :userId", { userId })
        .andWhere("t.type = :type", { type: TransactionType.SPEND })
        .andWhere("t.status = :status", { status: TransactionStatus.APPROVED })
        .andWhere("t.createdAt >= :start AND t.createdAt <= :end", {
          start,
          end,
        });
    const [daily, models] = await Promise.all([
      base()
        .select("DATE_FORMAT(t.createdAt, '%Y-%m-%d')", "day")
        .addSelect("SUM(ABS(t.creditsAmount))", "credits")
        .addSelect("COUNT(*)", "requests")
        .groupBy("DATE_FORMAT(t.createdAt, '%Y-%m-%d')")
        .orderBy("day", "ASC")
        .getRawMany(),
      base()
        .select("COALESCE(t.description, 'AI usage')", "name")
        .addSelect("SUM(ABS(t.creditsAmount))", "credits")
        .addSelect("COUNT(*)", "requests")
        .groupBy("t.description")
        .orderBy("credits", "DESC")
        .getRawMany(),
    ]);
    return {
      ...summarizeUsage(daily, start, period),
      period,
      timezone: "UTC",
      models: models.map((row) => ({
        name: String(row.name).replace(/^AI:\s*/, ""),
        credits: Number(row.credits),
        requests: Number(row.requests),
      })),
    };
  }
}
