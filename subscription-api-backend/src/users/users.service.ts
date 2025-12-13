import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { email },
        select: ['id', 'email', 'password', 'role', 'name', 'credits', 'avatar', 'referrerId', 'referralBalance'] 
    });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { id },
        select: ['id', 'email', 'role', 'credits', 'name', 'avatar', 'referrerId', 'referralBalance'] 
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    // 1. Створюємо об'єкт
    const newUser = this.usersRepository.create(userData);
    
    // 2. Валідація реферера
    if (userData.referrerId) {
        const referrer = await this.findOneById(userData.referrerId);
        if (!referrer) {
            // 🔥 ВИПРАВЛЕННЯ: Присвоюємо null замість delete
            newUser.referrerId = null;
        }
    }

    // 3. Зберігаємо
    return this.usersRepository.save(newUser);
  }

  async updateUser(id: number, updates: Partial<User>) {
    await this.usersRepository.update(id, updates);
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
        const currentBalance = Number(user.referralBalance) || 0;
        user.referralBalance = currentBalance + amountUsd;
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

  // Виправлена статистика
  async getAffiliateStats(userId: number) {
    const user = await this.findOneById(userId);
    
    if (!user) {
        throw new NotFoundException('User not found');
    }
    
    const invitedCount = await this.usersRepository.count({
        where: { referrerId: userId }
    });

    return {
        balance: Number(user.referralBalance || 0),
        invitedCount: invitedCount,
        referralLink: `https://genyxo.com?ref=${user.id}` // Твоє посилання
    };
  }
}
