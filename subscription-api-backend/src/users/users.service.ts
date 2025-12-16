import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>, // Приватний репозиторій - це правильно
  ) {}

  // Для доступу до репозиторію в екстрених випадках (але краще через методи)
  get repo(): Repository<User> {
    return this.usersRepository;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { email },
        // Обов'язково додаємо googleId та facebookId, щоб перевіряти їх наявність
        select: ['id', 'email', 'password', 'role', 'name', 'credits', 'avatar', 'referrerId', 'referralBalance', 'isEmailVerified', 'googleId', 'facebookId'] 
    });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { id },
        select: ['id', 'email', 'role', 'credits', 'name', 'avatar', 'referrerId', 'referralBalance', 'isEmailVerified'] 
    });
  }

  // Новий метод для пошуку по токену верифікації
  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { verificationToken: token } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    
    if (userData.referrerId) {
        const referrer = await this.findOneById(userData.referrerId);
        if (!referrer) {
            newUser.referrerId = null;
        }
    }

    return this.usersRepository.save(newUser);
  }

  async updateUser(id: number, updates: Partial<User>) {
    await this.usersRepository.update(id, updates);
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
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
}
