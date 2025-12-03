import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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

  async createPayment(userId: number, packId: number) {
    const pack = PACKS[packId];
    if (!pack) throw new BadRequestException('Package not found');

    // Створюємо запис у БД
    const transaction = this.transactionRepo.create({
      amount: pack.price,
      creditsAmount: pack.credits,
      status: TransactionStatus.PENDING,
      provider: 'NOWPAYMENTS',
      user: { id: userId }
    });

    await this.transactionRepo.save(transaction);

    try {
      // Запит до NowPayments для створення інвойсу
      const response = await axios.post(
        process.env.NOWPAYMENTS_API_URL!,
        {
          price_amount: pack.price,
          price_currency: 'usd', // Валюта ціни (долар)
          order_id: transaction.id.toString(),
          order_description: `Purchase: ${pack.name}`,
          ipn_callback_url: 'https://hostaisite-production.up.railway.app/payment/webhook', // Твій URL на Railway
          success_url: 'https://hostaisite-production.up.railway.app/#success', // Куди повернути після успіху
          cancel_url: 'https://hostaisite-production.up.railway.app/#cancel', // Куди повернути після відміни
        },
        {
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      // Зберігаємо ID інвойсу від NowPayments
      transaction.externalId = response.data.id;
      await this.transactionRepo.save(transaction);

      // Повертаємо URL, куди перенаправити клієнта
      return { 
        url: response.data.invoice_url 
      };

    } catch (error) {
      this.logger.error('NowPayments Create Error:', error.response?.data || error.message);
      throw new BadRequestException('Payment gateway error');
    }
  }
  
  async handleWebhook(headers: any, body: any) {
    const signature = headers['x-nowpayments-sig'];
    
    // ВАЖЛИВО: Сортуємо ключі для перевірки підпису (вимога NowPayments)
    const sortedKeys = Object.keys(body).sort();
    const jsonString = sortedKeys.map(key => `${key}=${body[key]}`).join('&');
    
    const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!);
    const calculatedSignature = hmac.update(jsonString).digest('hex');

    if (signature !== calculatedSignature) {
        this.logger.error('Invalid signature from NowPayments');
        throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Webhook received for Order #${body.order_id}, Status: ${body.payment_status}`);

    const transactionId = Number(body.order_id);
    const status = body.payment_status; // 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'expired'

    const transaction = await this.transactionRepo.findOne({ 
        where: { id: transactionId },
        relations: ['user'] 
    });

    if (!transaction) return;

    // Логіка зміни статусів
    if (status === 'finished' || status === 'confirmed') {
        if (transaction.status !== TransactionStatus.APPROVED) {
            transaction.status = TransactionStatus.APPROVED;
            await this.transactionRepo.save(transaction);

            // Нарахування кредитів
            await this.usersService.addCredits(transaction.user.id, transaction.creditsAmount);

            // Сповіщення
            await this.notificationsService.create(
                transaction.user.id,
                'Payment Successful! 🎉',
                `Received payment via NowPayments. Added ${transaction.creditsAmount} credits.`,
                NotificationType.SYSTEM
            );
        }
    } else if (status === 'failed' || status === 'expired') {
        transaction.status = TransactionStatus.DECLINED;
        await this.transactionRepo.save(transaction);
    } else {
        // Проміжні статуси (waiting, confirming)
        transaction.status = TransactionStatus.WAITING; // Можна додати більше статусів, якщо треба
        await this.transactionRepo.save(transaction);
    }

    return { status: 'ok' };
  }
}
