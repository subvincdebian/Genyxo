import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthSession } from "./auth-session.entity";
import { createHash, randomInt } from "crypto";
import { RedisCacheService } from "../common/redis-cache.service";
import { User } from "./user.entity";
import { Role } from "./role.enum";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../transactions/transaction.entity";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { frontendUrl } from "../common/frontend-url";
import { assertNotificationPatch } from "../notifications/notification-preferences";

const REFERRAL_REWARDS: Record<number, number> = {
  1: 1, // Start AI
  2: 1, // AI Explorer
  3: 2.5, // Pro Creator
  4: 5, // AI Master
  5: 10, // Power Credits
  6: 22, // Titan Credits
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private redisCache: RedisCacheService,
  ) {}

  async trackSession(
    userId: number,
    token: string,
    payload: { iat?: number; exp?: number; sessionVersion?: number },
    agent = "",
    ip = "",
    deviceId?: string,
  ) {
    const id = createHash("sha256").update(token).digest("hex");
    const runner =
      this.usersRepository.manager.connection.createQueryRunner("master");
    try {
      await runner.connect();
      const now = new Date();
      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(AuthSession)
        .values({
          id,
          userId,
          deviceId: deviceId || null,
          sessionVersion: payload.sessionVersion ?? 0,
          userAgent: agent.slice(0, 512),
          ip: ip.slice(0, 64),
          createdAt: new Date(
            (payload.iat || Math.floor(Date.now() / 1000)) * 1000,
          ),
          lastUsedAt: now,
          expiresAt: new Date(
            (payload.exp || Math.floor(Date.now() / 1000)) * 1000,
          ),
          revokedAt: null,
        })
        .orIgnore()
        .execute();
      const session = await runner.manager.findOneBy(AuthSession, {
        id,
        userId,
      });
      if (!session || session.revokedAt || session.expiresAt <= now)
        return null;
      // Older signed tokens acquire an installation identity once. Never reassign a known device.
      if (!session.deviceId && deviceId)
        await runner.manager
          .createQueryBuilder()
          .update(AuthSession)
          .set({ deviceId })
          .where("id = :id AND userId = :userId AND deviceId IS NULL", {
            id,
            userId,
          })
          .execute();
      if (now.getTime() - session.lastUsedAt.getTime() > 60000)
        await runner.manager.update(
          AuthSession,
          { id, userId },
          { lastUsedAt: now },
        );
      return id;
    } finally {
      await runner.release();
    }
  }
  async listSessions(userId: number, currentId?: string) {
    const version = await this.getSessionVersion(userId);
    const rows = await this.usersRepository.manager
      .getRepository(AuthSession)
      .createQueryBuilder("s")
      .where(
        "s.userId = :userId AND s.sessionVersion = :version AND s.revokedAt IS NULL AND s.expiresAt > :now",
        { userId, version, now: new Date() },
      )
      .orderBy("s.lastUsedAt", "DESC")
      .getMany();
    const devices = new Map<string, AuthSession>();
    const current = rows.find((row) => row.id === currentId);
    const currentKey = current?.deviceId || current?.id;
    for (const row of rows) {
      const key = row.deviceId || row.id;
      const previous = devices.get(key);
      if (!previous) devices.set(key, row);
      else if (row.id === currentId)
        devices.set(key, { ...row, lastUsedAt: previous.lastUsedAt });
    }
    return [...devices.entries()].map(
      ([key, { id, deviceId, userAgent, ip, createdAt, lastUsedAt }]) => ({
        id,
        userAgent,
        ip,
        createdAt,
        lastUsedAt,
        current: key === currentKey,
        legacy: !deviceId,
      }),
    );
  }
  async securityHistory(userId: number, cursor?: string) {
    const query = this.usersRepository.manager
      .getRepository(AuthSession)
      .createQueryBuilder("s")
      .where("s.userId = :userId", { userId });
    if (cursor) {
      try {
        const value = JSON.parse(Buffer.from(cursor, "base64url").toString());
        if (
          !/^[a-f0-9]{64}$/.test(value.id) ||
          !Number.isFinite(Date.parse(value.date))
        )
          throw new Error();
        query.andWhere(
          "(s.createdAt < :date OR (s.createdAt = :date AND s.id < :id))",
          { date: new Date(value.date), id: value.id },
        );
      } catch {
        throw new BadRequestException("Invalid history cursor");
      }
    }
    const rows = await query
      .orderBy("s.createdAt", "DESC")
      .addOrderBy("s.id", "DESC")
      .take(16)
      .getMany();
    const page = rows.slice(0, 15);
    const last = page.at(-1);
    return {
      items: page.map(({ id, userAgent, ip, createdAt }) => ({
        id,
        userAgent,
        ip,
        createdAt,
      })),
      nextCursor:
        rows.length > 15 && last
          ? Buffer.from(
              JSON.stringify({
                date: last.createdAt.toISOString(),
                id: last.id,
              }),
            ).toString("base64url")
          : null,
    };
  }
  async revokeDevice(userId: number, id: string) {
    const repo = this.usersRepository.manager.getRepository(AuthSession);
    const session = await repo.findOneBy({ id, userId });
    if (!session) throw new NotFoundException("Session not found");
    const rows = await repo.findBy(
      session.deviceId
        ? { userId, deviceId: session.deviceId }
        : { userId, id },
    );
    await repo.update(
      session.deviceId
        ? { userId, deviceId: session.deviceId }
        : { userId, id },
      { revokedAt: new Date() },
    );
    return rows.map((row) => row.id);
  }
  async revokeSession(userId: number, id: string) {
    const result = await this.usersRepository.manager
      .getRepository(AuthSession)
      .update({ id, userId }, { revokedAt: new Date() });
    if (!result.affected) throw new NotFoundException("Session not found");
    return { status: "success" };
  }
  /** A sign-in from an installation (or, without one, a browser) never seen before. */
  async isNewDevice(userId: number, deviceId?: string, agent = "") {
    const sessions = this.usersRepository.manager.getRepository(AuthSession);
    if (!(await sessions.count({ where: { userId } }))) return false;
    const known = await sessions.count({
      where: deviceId
        ? { userId, deviceId }
        : { userId, userAgent: agent.slice(0, 512) },
    });
    return known === 0;
  }
  async interactionSettings(userId: number) {
    const rows = await this.usersRepository.manager.query(
      "SELECT settings FROM user_interaction_settings WHERE userId = ?",
      [userId],
    );
    const value = rows[0]?.settings;
    return typeof value === "string" ? JSON.parse(value) : value || {};
  }
  async updateInteractionSettings(
    userId: number,
    patch: Record<string, unknown>,
  ) {
    const shortcuts = patch.shortcuts;
    if (shortcuts) {
      const ids = [
        "focus",
        "send",
        "backgroundSend",
        "effort",
        "attach",
        "delete",
        "new",
        "help",
        "search",
        "sidebar",
        ...Array.from({ length: 9 }, (_, i) => `recent${i + 1}`),
      ];
      for (const [id, value] of Object.entries(
        shortcuts as Record<string, any>,
      )) {
        if (
          !ids.includes(id) ||
          !value ||
          typeof value.enabled !== "boolean" ||
          typeof value.binding !== "string" ||
          !/^(?:(?:Ctrl|Alt|Shift)\+)*(?:Key[A-Z]|Digit[1-9]|Enter|Escape|Backspace|Delete|Space|Slash|Arrow(?:Up|Down|Left|Right))$/.test(
            value.binding,
          )
        )
          throw new BadRequestException("Invalid keyboard shortcut");
      }
    }
    if (patch.notifications !== undefined)
      assertNotificationPatch(patch.notifications);
    await this.usersRepository.manager.query(
      "INSERT INTO user_interaction_settings (userId, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE settings = JSON_MERGE_PATCH(settings, VALUES(settings))",
      [userId, JSON.stringify(patch)],
    );
    return this.interactionSettings(userId);
  }

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
        "verificationToken",
        "verificationExpires",
        "resetPasswordToken",
        "resetPasswordExpires",
      ],
    });
  }

  async findRegistrationConflict(
    email: string,
  ): Promise<Pick<User, "id" | "googleId"> | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ["id", "googleId"],
    });
  }

  async findByOAuthId(
    provider: "google" | "facebook",
    id: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: provider === "google" ? { googleId: id } : { facebookId: id },
      select: [
        "id",
        "email",
        "role",
        "name",
        "credits",
        "avatar",
        "googleId",
        "facebookId",
        "isEmailVerified",
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

  async findAuthUserById(
    id: number,
  ): Promise<{ id: number; email: string; role: Role } | null> {
    const cacheKey = `user_auth:${id}`;
    const cached = await this.redisCache.get<{
      id: number;
      email: string;
      role: Role;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.usersRepository.findOne({
      where: { id },
      select: ["id", "email", "role"],
    });

    if (user) {
      const authData = { id: user.id, email: user.email, role: user.role };
      await this.redisCache.set(cacheKey, authData, 300);
      return authData;
    }

    return null;
  }

  async getSessionVersion(id: number): Promise<number> {
    // Never cache revocation state: a revoked JWT must fail on its next request.
    const runner =
      this.usersRepository.manager.connection.createQueryRunner("master");
    try {
      const user = await runner.manager.findOne(User, {
        where: { id },
        select: ["id", "sessionVersion"],
      });
      if (!user) throw new NotFoundException("User not found");
      return user.sessionVersion;
    } finally {
      await runner.release();
    }
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { verificationToken: token },
      select: [
        "id",
        "email",
        "name",
        "role",
        "credits",
        "avatar",
        "isEmailVerified",
        "verificationToken",
        "verificationExpires",
      ],
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { resetPasswordToken: token },
      select: [
        "id",
        "email",
        "password",
        "resetPasswordToken",
        "resetPasswordExpires",
      ],
    });
  }

  async generateUniqueReferralCode(): Promise<string> {
    // Алфавит: большие, маленькие буквы и цифры (убрали похожие символы для удобства юзера)
    const alphabet =
      "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const size = 10; // Длина 10 символов как в Grass

    let code = "";
    // randomInt is uniform; a byte modulo the alphabet favours early letters.
    for (let i = 0; i < size; i++) code += alphabet[randomInt(alphabet.length)];

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
      await this.redisCache.del(
        `user_profile:${user.id}`,
        `user_auth:${user.id}`,
      );
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
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ["id", "credits"],
      });
      balance = user ? Number(user.credits) : 0;
      await this.redisCache.setBalance(userId, balance);
    }

    return balance;
  }

  async getAffiliateStats(userId: number) {
    const cacheKey = `affiliate_stats:${userId}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached) return cached;

    const [user, invitedCount] = await Promise.all([
      this.usersRepository.findOne({
        where: { id: userId },
        select: ["id", "referralBalance", "referralCode"],
      }),
      this.usersRepository.count({
        where: { referrerId: userId },
      }),
    ]);

    if (!user) throw new NotFoundException("User not found");

    let code = user.referralCode;
    if (!code) {
      code = await this.generateUniqueReferralCode();
      await this.usersRepository.update(userId, { referralCode: code });
    }

    const referralTarget = frontendUrl();
    referralTarget.searchParams.set("referralCode", code);
    const result = {
      balance: Number(user.referralBalance || 0),
      invitedCount,
      referralLink: referralTarget.href,
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
    const rewardAmount = REFERRAL_REWARDS[packId] || 0;
    if (rewardAmount <= 0) return;

    const buyer = await this.usersRepository.findOne({
      where: { id: buyerId },
      select: ["id", "referrerId", "isReferralPaid"],
    });

    if (!buyer || !buyer.referrerId || buyer.isReferralPaid) {
      return;
    }

    let referrerToInvalidate: number | null = null;

    await this.usersRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const lockedBuyer = await transactionalEntityManager.findOne(User, {
          where: { id: buyerId },
          select: ["id", "isReferralPaid", "referrerId"],
          lock: { mode: "pessimistic_write" },
        });

        if (
          !lockedBuyer ||
          lockedBuyer.isReferralPaid ||
          !lockedBuyer.referrerId
        )
          return;

        await transactionalEntityManager.increment(
          User,
          { id: lockedBuyer.referrerId },
          "referralBalance",
          rewardAmount,
        );

        await transactionalEntityManager.update(User, buyerId, {
          isReferralPaid: true,
        });

        referrerToInvalidate = lockedBuyer.referrerId;
      },
    );

    if (referrerToInvalidate) {
      await this.redisCache.del(
        `affiliate_stats:${referrerToInvalidate}`,
        `user_profile:${referrerToInvalidate}`,
      );
    }

    this.logger.log(
      `[Affiliate] Reward $${rewardAmount} paid to User ${buyer.referrerId} for User ${buyerId} (Pack ${packId})`,
    );
  }

  async invalidateUserCache(userId: number): Promise<void> {
    await this.redisCache.invalidate(userId);
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
    type?: TransactionType,
  ) {
    const { page = 1, limit = 10 } = paginationQuery;

    const [items, total] = await this.transactionRepository.findAndCount({
      where: { userId, ...(type ? { type } : {}) },
      select: [
        "id",
        "amount",
        "creditsAmount",
        "status",
        "type",
        "description",
        "createdAt",
      ],
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
