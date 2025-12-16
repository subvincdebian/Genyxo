import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionStatus } from '../transactions/transaction.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async getAllUsers(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.userRepo.findAndCount({
      order: { id: 'DESC' },
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
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionRepo.findAndCount({
      order: { id: 'DESC' },
      relations: ['user'],
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
