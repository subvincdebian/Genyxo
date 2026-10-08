import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { RedisCacheService } from "../common/redis-cache.service";
import { User } from "./user.entity";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../transactions/transaction.entity";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

const REFERRAL_REWARDS: Record<number, number> = {
  1: 1, // Start AI
  2: 1, // AI Explorer
  3: 2.5, // Pro Creator
  4: 5, // AI Master
  5: 10, // Unlimited Power
  6: 22, // AI Titan
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private redisCache: RedisCacheService,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: [
        "id",
        "email",
        "password",
        "role",
        "name",
        "credits",
        "avatar",
        "referrerId",
        "referralBalance",
        "isEmailVerified",
        "googleId",
        "facebookId",
      ],
    });
  }

  async findOneById(id: number): Promise<User | null> {
    const cacheKey = `user_profile:${id}`;
    const cached = await this.redisCache.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findOne({
      where: { id },
      select: [
        "id",
        "email",
        "role",
        "credits",
        "name",
        "avatar",
        "referrerId",
        "referralBalance",
        "isEmailVerified",
      ],
    });

    if (user) {
      await this.redisCache.set(cacheKey, user, 300);
    }

    return user;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { verificationToken: token },
    });
  }

  async generateUniqueReferralCode(): Promise<string> {
    // Алфавит: большие, маленькие буквы и цифры (убрали похожие символы для удобства юзера)
    const alphabet =
      "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const size = 10; // Длина 10 символов как в Grass

    let code = "";
    const bytes = randomBytes(size);

    for (let i = 0; i < size; i++) {
      // Используем остаток от деления байта на длину алфавита
      code += alphabet[bytes[i] % alphabet.length];
    }

    // Проверка на уникальность в БД
    const existing = await this.usersRepository.findOne({
      where: { referralCode: code },
      select: ["id"], // Выбираем только id для скорости
    });

    if (existing) {
      return this.generateUniqueReferralCode(); // Рекурсия при коллизии
    }

    return code;
  }

  async create(userData: Partial<User>): Promise<User> {
    const referralCode =
      userData.referralCode || (await this.generateUniqueReferralCode());
    const newUser = this.usersRepository.create({ ...userData, referralCode });
    return this.usersRepository.save(newUser);
  }

  async updateUser(id: number, updates: Partial<User>) {
    const { name, avatar } = updates;
    await this.usersRepository.update(id, { name, avatar });
    await this.redisCache.del(`user_profile:${id}`);
  }

  async save(user: User): Promise<User> {
    const saved = await this.usersRepository.save(user);
    if (user.id) {
      await this.redisCache.del(`user_profile:${user.id}`);
    }
    return saved;
  }

  async addCredits(userId: number, amount: number): Promise<void> {
    const creditsToAdd = Number(amount);
    if (isNaN(creditsToAdd) || creditsToAdd <= 0) return;

    await this.usersRepository.increment(
      { id: userId },
      "credits",
      creditsToAdd,
    );

    await this.redisCache.invalidate(userId);
  }

  async addReferralBalance(userId: number, amountUsd: number): Promise<void> {
    const addAmount = Number(amountUsd);
    if (isNaN(addAmount) || addAmount <= 0) return;

    await this.usersRepository.increment(
      { id: userId },
      "referralBalance",
      addAmount,
    );

    await this.redisCache.del(
      `affiliate_stats:${userId}`,
      `user_profile:${userId}`,
    );
  }

  async deductCredits(userId: number, amount: number): Promise<boolean> {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return true;

    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ credits: () => `credits - ${numericAmount}` })
      .where("id = :id AND credits >= :amount", {
        id: userId,
        amount: numericAmount,
      })
      .execute();

    const success = (result.affected ?? 0) > 0;

    if (success) {
      await this.redisCache.invalidate(userId);
    }

    return success;
  }

  async getBalance(userId: number): Promise<number> {
    let balance = await this.redisCache.getBalance(userId);

    if (balance === null) {
      const user = await this.findOneById(userId);
      balance = user ? Number(user.credits) : 0;
      await this.redisCache.setBalance(userId, balance);
    }

    return balance;
  }

  async getAffiliateStats(userId: number) {
    const cacheKey = `affiliate_stats:${userId}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ["id", "referralBalance", "referralCode"],
    });

    if (!user) throw new NotFoundException("User not found");

    let code = user.referralCode;
    if (!code) {
      code = await this.generateUniqueReferralCode();
      await this.usersRepository.update(userId, { referralCode: code });
    }

    const invitedCount = await this.usersRepository.count({
      where: { referrerId: userId },
    });

    const result = {
      balance: Number(user.referralBalance || 0),
      invitedCount,
      referralLink: `https://genyxo.com/?referralCode=${code}`,
    };

    await this.redisCache.set(cacheKey, result, 60);
    return result;
  }

  async findByReferralCode(code: string): Promise<User | null> {
    if (!code) return null;
    return this.usersRepository.findOne({
      where: { referralCode: code },
      select: ["id"],
    });
  }

  async processReferralBonus(buyerId: number, packId: number): Promise<void> {
    const buyer = await this.usersRepository.findOne({
      where: { id: buyerId },
      select: ["id", "referrerId", "isReferralPaid"],
    });

    if (!buyer || !buyer.referrerId || buyer.isReferralPaid) {
      return;
    }

    const rewardAmount = REFERRAL_REWARDS[packId] || 0;
    if (rewardAmount <= 0) return;

    await this.usersRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const lockedBuyer = await transactionalEntityManager.findOne(User, {
          where: { id: buyerId },
          lock: { mode: "pessimistic_write" },
        });

        if (!lockedBuyer || lockedBuyer.isReferralPaid) return;

        await transactionalEntityManager.increment(
          User,
          { id: buyer.referrerId },
          "referralBalance",
          rewardAmount,
        );

        await transactionalEntityManager.update(User, buyerId, {
          isReferralPaid: true,
        });

        await this.redisCache.del(
          `affiliate_stats:${buyer.referrerId}`,
          `user_profile:${buyer.referrerId}`,
        );

        console.log(
          `[Affiliate] Reward $${rewardAmount} paid to User ${buyer.referrerId} for User ${buyerId} (Pack ${packId})`,
        );
      },
    );
  }

  async logTransaction(
    userId: number,
    amount: number,
    type: TransactionType,
    description: string,
  ) {
    const tx = this.transactionRepository.create({
      userId,
      creditsAmount: amount,
      amount: 0,
      status: TransactionStatus.APPROVED,
      type,
      description,
      provider: "INTERNAL",
    });
    return this.transactionRepository.save(tx);
  }

  async getUserTransactions(
    userId: number,
    paginationQuery: PaginationQueryDto,
  ) {
    const { page = 1, limit = 10 } = paginationQuery;

    const [items, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }
}
