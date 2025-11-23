import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../users/transaction.entity';
import { TransactionStatus } from '../users/transaction.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async getAllUsers() {
    return this.userRepo.find();
  }

  async getAllTransactions() {
    return this.transactionRepo.find({
      order: { id: 'DESC' },
      relations: ['user']
    });
  }

  async manualAddCredits(userId: number, amount: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.credits = Number(user.credits) + Number(amount);
      return this.userRepo.save(user);
    }
    return null;
  }

  async approveTransaction(txId: number) {
    const tx = await this.transactionRepo.findOne({ where: { id: txId }, relations: ['user'] });
    
    if (tx) {
        tx.status = TransactionStatus.APPROVED;
        await this.transactionRepo.save(tx);
        
        const user = tx.user;
        user.credits = Number(user.credits) + Number(tx.creditsAmount);
        await this.userRepo.save(user);
        
        return { status: 'ok' };
    }
    return { status: 'error', message: 'Transaction not found or already processed' };
  }
}
