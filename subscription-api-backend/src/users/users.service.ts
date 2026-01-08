import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid';

const REFERRAL_REWARDS: Record<number, number> = {
  1: 1, // Start AI
  2: 1, // AI Explorer
  3: 2.5, // Pro Creator
  4: 5, // AI Master
  5: 10, // Unlimited Power
  6: 22  // AI Titan
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  get repo(): Repository<User> {
    return this.usersRepository;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { email },
        select: ['id', 'email', 'password', 'role', 'name', 'credits', 'avatar', 'referrerId', 'referralBalance', 'isEmailVerified', 'googleId', 'facebookId'] 
    });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { id },
        select: ['id', 'email', 'role', 'credits', 'name', 'avatar', 'referrerId', 'referralBalance', 'isEmailVerified'] 
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { verificationToken: token } });
  }

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.referralCode) {
      userData.referralCode = await this.generateUniqueReferralCode();
    }
    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  async updateUser(id: number, updates: Partial<User>) {
    await this.usersRepository.update(id, updates);
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async generateUniqueReferralCode(): Promise<string> {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    let code = '';

    while (!isUnique) {
      // Генеруємо код на 7 символів
      code = '';
      for (let i = 0; i < 7; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Перевіряємо в базі, чи вже існує такий код
      const existing = await this.usersRepository.findOne({ where: { referralCode: code } });
      if (!existing) {
        isUnique = true;
      }
    }
    return code;
  }

  async addCredits(userId: number, amount: number): Promise<void> {
    const user = await this.findOneById(userId);
    if (user) {
      const currentCredits = Number(user.credits) || 0;
      const creditsToAdd = Number(amount) || 0;
      user.credits = currentCredits + creditsToAdd;
      await this.usersRepository.save(user);
    }
  }

  async addReferralBalance(userId: number, amountUsd: number): Promise<void> {
    const user = await this.findOneById(userId);
    if (user) {
        const currentBalance = parseFloat(user.referralBalance?.toString() || '0');
        const addAmount = parseFloat(amountUsd.toString());
        user.referralBalance = currentBalance + addAmount;
        await this.usersRepository.save(user);
    }
  }

  async deductCredits(userId: number, amount: number): Promise<boolean> {
    const user = await this.findOneById(userId);
    if (!user) return false;

    const currentCredits = Number(user.credits) || 0;
    if (currentCredits < amount) return false;

    user.credits = currentCredits - amount;
    await this.usersRepository.save(user);
    return true;
  }

  async getBalance(userId: number): Promise<number> {
    const user = await this.findOneById(userId);
    return user ? Number(user.credits) : 0;
  }

  async getAffiliateStats(userId: number) {
    const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'referralBalance']
    });
    
    if (!user) {
        throw new NotFoundException('User not found');
    }
    
    const invitedCount = await this.usersRepository.count({
        where: { referrerId: userId }
    });

    const baseUrl = 'https://genyxo.com'; 

    return {
        balance: Number(user.referralBalance || 0),
        invitedCount: invitedCount,
        referralLink: `${baseUrl}?ref=${user.id}`
    };
  }

  async processReferralBonus(buyerId: number, packId: number): Promise<void> {
    // 1. Шукаємо покупця разом з даними про його реферера
    const buyer = await this.usersRepository.findOne({
        where: { id: buyerId },
        select: ['id', 'referrerId', 'isReferralPaid']
    });

    // 2. Перевірки: чи є реферер і чи НЕ була вже виплата за цього юзера
    if (!buyer || !buyer.referrerId || buyer.isReferralPaid) {
        return; // Виходимо, якщо умов не дотримано
    }

    const rewardAmount = REFERRAL_REWARDS[packId] || 0;
    if (rewardAmount <= 0) return;

    // 3. Використовуємо транзакцію бази даних, щоб уникнути подвійних нарахувань при збоях
    await this.usersRepository.manager.transaction(async (transactionalEntityManager) => {
        // Повторна перевірка всередині транзакції для безпеки (Locking)
        const lockedBuyer = await transactionalEntityManager.findOne(User, {
            where: { id: buyerId },
            lock: { mode: 'pessimistic_write' }
        });

        if (!lockedBuyer || lockedBuyer.isReferralPaid) return;

        // Нараховуємо кошти рефереру
        await transactionalEntityManager.increment(User, 
            { id: buyer.referrerId }, 
            'referralBalance', 
            rewardAmount
        );

        // Позначаємо покупця як "оплаченого" для партнерки
        await transactionalEntityManager.update(User, buyerId, { 
            isReferralPaid: true 
        });
        
        console.log(`[Affiliate] Reward $${rewardAmount} paid to User ${buyer.referrerId} for User ${buyerId} (Pack ${packId})`);
    });
  }
}
