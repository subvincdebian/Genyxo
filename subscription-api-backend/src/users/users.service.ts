import { Injectable } from '@nestjs/common';
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
        // Вибираємо пароль, щоб AuthService міг його перевірити
        select: ['id', 'email', 'password', 'role', 'name', 'credits', 'avatar'] 
    });
  }

  // ✅ ВИПРАВЛЕНО: Тепер повертає всі дані (включаючи credits) для ProfileController
  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { id },
        select: ['id', 'email', 'role', 'credits', 'name', 'avatar'] 
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  async updateUser(id: number, updates: Partial<User>) {
    await this.usersRepository.update(id, updates);
  }

  // ✅ Безпечне додавання кредитів
  async addCredits(userId: number, amount: number): Promise<void> {
    const user = await this.findOneById(userId);
    if (user) {
      const currentCredits = Number(user.credits) || 0;
      const creditsToAdd = Number(amount) || 0;
      
      user.credits = currentCredits + creditsToAdd;
      
      await this.usersRepository.save(user);
    }
  }

  // 💥 ОСТАТОЧНЕ ВИПРАВЛЕННЯ: Усуваємо помилку 'user' is possibly 'null'.
  async deductCredits(userId: number, amount: number): Promise<boolean> {
    const user = await this.findOneById(userId);
    
    // Крок 1: Обов'язкова перевірка на null
    if (!user) {
      return false;
    }

    // Крок 2: Безпечний доступ до credits (тепер user гарантовано існує)
    const currentCredits = Number(user.credits) || 0;
    
    if (currentCredits < amount) {
      return false;
    }

    user.credits = currentCredits - amount;
    await this.usersRepository.save(user);
    
    return true;
  }

  // ✅ Безпечне отримання балансу
  async getBalance(userId: number): Promise<number> {
    const user = await this.findOneById(userId);
    return user ? Number(user.credits) : 0;
  }
}
