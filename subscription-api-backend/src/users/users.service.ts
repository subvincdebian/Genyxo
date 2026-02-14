import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Transaction, TransactionStatus, TransactionType } from '../transactions/transaction.entity';

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

    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
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

  async generateUniqueReferralCode(): Promise<string> {
    const code = Math.random().toString(36).substring(2, 9).toUpperCase();
    const existing = await this.usersRepository.findOne({ where: { referralCode: code } });
    return existing ? this.generateUniqueReferralCode() : code;
  }

  async create(userData: Partial<User>): Promise<User> {
    const referralCode = userData.referralCode || await this.generateUniqueReferralCode();
    const newUser = this.usersRepository.create({ ...userData, referralCode });
    return this.usersRepository.save(newUser);
  }

  async updateUser(id: number, updates: Partial<User>) {
    const { name, avatar } = updates;
    await this.usersRepository.update(id, { name, avatar });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async addCredits(userId: number, amount: number): Promise<void> {
    const creditsToAdd = Number(amount);
    if (isNaN(creditsToAdd) || creditsToAdd <= 0) return;

    await this.usersRepository.increment({ id: userId }, 'credits', creditsToAdd);
  }

  async addReferralBalance(userId: number, amountUsd: number): Promise<void> {
    const addAmount = Number(amountUsd);
    if (isNaN(addAmount) || addAmount <= 0) return;

    await this.usersRepository.increment({ id: userId }, 'referralBalance', addAmount);
  }

  async deductCredits(userId: number, amount: number): Promise<boolean> {
    if (amount <= 0) return true;

    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ credits: () => `credits - ${amount}` })
      .where("id = :id AND credits >= :amount", { id: userId, amount })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async getBalance(userId: number): Promise<number> {
    const user = await this.findOneById(userId);
    return user ? Number(user.credits) : 0;
  }

  async getAffiliateStats(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId }, select: ['id', 'referralBalance'] });
    if (!user) throw new NotFoundException('User not found');
    
    const invitedCount = await this.usersRepository.count({ where: { referrerId: userId } });
    return {
      balance: Number(user.referralBalance || 0),
      invitedCount,
      referralLink: `https://genyxo.com?ref=${user.id}`
    };
  }

  async processReferralBonus(buyerId: number, packId: number): Promise<void> {
    const buyer = await this.usersRepository.findOne({
        where: { id: buyerId },
        select: ['id', 'referrerId', 'isReferralPaid']
    });

    if (!buyer || !buyer.referrerId || buyer.isReferralPaid) {
        return;
    }

    const rewardAmount = REFERRAL_REWARDS[packId] || 0;
    if (rewardAmount <= 0) return;

    await this.usersRepository.manager.transaction(async (transactionalEntityManager) => {
        const lockedBuyer = await transactionalEntityManager.findOne(User, {
            where: { id: buyerId },
            lock: { mode: 'pessimistic_write' }
        });

        if (!lockedBuyer || lockedBuyer.isReferralPaid) return;

        await transactionalEntityManager.increment(User, 
            { id: buyer.referrerId }, 
            'referralBalance', 
            rewardAmount
        );

        await transactionalEntityManager.update(User, buyerId, { 
            isReferralPaid: true 
        });
        
        console.log(`[Affiliate] Reward $${rewardAmount} paid to User ${buyer.referrerId} for User ${buyerId} (Pack ${packId})`);
    });
  }

  async logTransaction(userId: number, amount: number, type: TransactionType, description: string) {
    const tx = this.transactionRepository.create({
        userId,
        creditsAmount: amount,
        amount: 0,
        status: TransactionStatus.APPROVED,
        type,
        description,
        provider: 'INTERNAL'
    });
    return this.transactionRepository.save(tx);
  }
}