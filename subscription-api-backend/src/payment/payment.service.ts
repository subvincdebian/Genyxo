import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../users/transaction.entity'; 
import { UsersService } from '../users/users.service';

export const PACKS: Record<number, { name: string, price: number, credits: number }> = {
  1: { name: 'Start AI', price: 1.50, credits: 500 },
  2: { name: 'AI Explorer', price: 2.00, credits: 1000 },
  3: { name: 'Pro Creator', price: 3.50, credits: 2000 },
  4: { name: 'AI Master', price: 7.00, credits: 5000 },
  5: { name: 'Unlimited Power', price: 12.00, credits: 10000 },
  6: { name: 'AI Titan', price: 25.00, credits: 25000 },
};

const REQUISITES = {
  UAH_CARD: {
    number: '4441 1111 2222 3333',
    holder: 'Ivan Ivanov (Monobank)',
    currency: 'UAH',
    network: 'Monobank/Privat'
  },
  USDT_WALLET: {
    address: 'T...................................',
    network: 'TRC20 (Tron)',
    currency: 'USDT'
  }
};


@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    private usersService: UsersService
  ) {}

  /**
   * Створення транзакції та отримання інструкцій до оплати.
   */
  async createPayment(userId: number, packId: number, method: string) {
    
    const pack = PACKS[packId];
    if (!pack) {
        throw new BadRequestException('PACK_NOT_FOUND', 'Such a package does not exist.');
    }

    let instructions: any;
    let providerName: string;

    // Генерація інструкцій (для ручних методів)
    if (method === 'MANUAL_CARD') {
        const priceUah = Math.ceil(pack.price * 42); 
        instructions = {
            ...REQUISITES.UAH_CARD,
            amount: `${priceUah} UAH`,
            description: `Order #${new Date().getTime()}` // Унікальний опис
        };
        providerName = 'MANUAL_CARD';
    } 
    else if (method === 'MANUAL_CRYPTO') {
        instructions = {
            ...REQUISITES.USDT_WALLET,
            amount: `${pack.price} USDT`,
            description: `Order #${new Date().getTime()}`
        };
        providerName = 'MANUAL_CRYPTO';
    } 
    else {
        throw new BadRequestException('UNKNOWN_PAYMENT_METHOD', 'Unknown payment method provided.');
    }

    // Створення об'єкта транзакції у базі даних
    const transaction = this.transactionRepo.create({
      amount: pack.price,
      creditsAmount: pack.credits,
      status: TransactionStatus.PENDING, // Використовуємо enum
      provider: providerName,
      user: { id: userId }
    });
    
    await this.transactionRepo.save(transaction);

    // Повертаємо ID для клієнта і інструкції
    return { 
        status: 'manual_pending',
        orderId: transaction.id, 
        instructions: instructions 
    };
  }
  
  async updateTransactionStatus(txId: number, newStatus: TransactionStatus, adminId: number) {
    const transaction = await this.transactionRepo.findOne({ 
        where: { id: txId },
        relations: ['user'] 
    });

    if (!transaction) throw new NotFoundException('Transaction not found.');

    // Валідація статусу (можна закоментувати для тестів, якщо треба змінити старі транзакції)
    if (transaction.status !== TransactionStatus.PENDING) {
       throw new BadRequestException(`Transaction is already ${transaction.status}.`);
    }

    transaction.status = newStatus;
    await this.transactionRepo.save(transaction);

    if (newStatus === TransactionStatus.APPROVED) {
        // Нарахування кредитів
        await this.usersService.addCredits(transaction.user.id, Number(transaction.creditsAmount));
    }

    return { status: 'success', newStatus };
  }
}
