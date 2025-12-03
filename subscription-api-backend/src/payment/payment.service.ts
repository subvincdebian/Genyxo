import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../users/transaction.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import axios from 'axios';
import * as crypto from 'crypto';

export const PACKS: Record<number, { name: string, price: number, credits: number }> = {
  1: { name: 'Start AI', price: 1.50, credits: 500 },
  2: { name: 'AI Explorer', price: 2.00, credits: 1000 },
  3: { name: 'Pro Creator', price: 3.50, credits: 2000 },
  4: { name: 'AI Master', price: 7.00, credits: 5000 },
  5: { name: 'Unlimited Power', price: 12.00, credits: 10000 },
  6: { name: 'AI Titan', price: 25.00, credits: 25000 },
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    private usersService: UsersService,
    private notificationsService: NotificationsService
  ) {}

  // 1. Створення посилання (NowPayments)
  async createPayment(userId: number, packId: number) {
    const pack = PACKS[packId];
    if (!pack) throw new BadRequestException('Package not found');

    const transaction = this.transactionRepo.create({
      amount: pack.price,
      creditsAmount: pack.credits,
      status: TransactionStatus.PENDING,
      provider: 'NOWPAYMENTS',
      user: { id: userId }
    });

    await this.transactionRepo.save(transaction);

    try {
      const response = await axios.post(
        process.env.NOWPAYMENTS_API_URL!,
        {
          price_amount: pack.price,
          price_currency: 'usd',
          order_id: transaction.id.toString(),
          order_description: `Purchase: ${pack.name}`,
          ipn_callback_url: 'https://hostaisite-production.up.railway.app/payment/webhook',
          success_url: 'https://hostaisite-production.up.railway.app/#success', 
          cancel_url: 'https://hostaisite-production.up.railway.app/#cancel', 
        },
        {
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      transaction.externalId = response.data.id;
      await this.transactionRepo.save(transaction);

      return { url: response.data.invoice_url };

    } catch (error) {
      this.logger.error('NowPayments Create Error:', error.response?.data || error.message);
      throw new BadRequestException('Payment gateway error');
    }
  }

  // 2. Webhook (NowPayments)
  async handleWebhook(headers: any, body: any) {
    const signature = headers['x-nowpayments-sig'];
    if (!signature) return; 

    const sortedKeys = Object.keys(body).sort();
    const jsonString = sortedKeys.map(key => `${key}=${body[key]}`).join('&');
    const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!);
    const calculatedSignature = hmac.update(jsonString).digest('hex');

    if (signature !== calculatedSignature) {
        this.logger.error('Invalid signature');
        throw new BadRequestException('Invalid signature');
    }

    const transactionId = Number(body.order_id);
    const status = body.payment_status; 

    const transaction = await this.transactionRepo.findOne({ 
        where: { id: transactionId },
        relations: ['user'] 
    });

    if (!transaction) return;

    if (status === 'finished' || status === 'confirmed') {
        if (transaction.status !== TransactionStatus.APPROVED) {
            await this.finalizeTransaction(transaction);
        }
    } else if (status === 'failed' || status === 'expired') {
        transaction.status = TransactionStatus.DECLINED;
        await this.transactionRepo.save(transaction);
    } else {
        transaction.status = TransactionStatus.WAITING;
        await this.transactionRepo.save(transaction);
    }

    return { status: 'ok' };
  }

  // 🔥 3. Метод для АДМІНКИ (Виправлення помилки build)
  async updateTransactionStatus(txId: number, newStatus: TransactionStatus, adminId: number) {
    const transaction = await this.transactionRepo.findOne({ 
        where: { id: txId },
        relations: ['user'] 
    });

    if (!transaction) throw new NotFoundException('Transaction not found.');

    transaction.status = newStatus;
    await this.transactionRepo.save(transaction);

    // Якщо адмін натиснув Approve - нараховуємо кредити
    if (newStatus === TransactionStatus.APPROVED) {
        await this.finalizeTransaction(transaction);
    }

    return { status: 'success', newStatus };
  }

  // Допоміжний метод (щоб не дублювати код нарахування)
  private async finalizeTransaction(transaction: Transaction) {
      transaction.status = TransactionStatus.APPROVED;
      await this.transactionRepo.save(transaction);

      await this.usersService.addCredits(transaction.user.id, Number(transaction.creditsAmount));

      await this.notificationsService.create(
          transaction.user.id,
          'Payment Successful! 🎉',
          `Your account received ${transaction.creditsAmount} credits.`,
          NotificationType.SYSTEM
      );
  }
}
