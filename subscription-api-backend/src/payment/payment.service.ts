import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../transactions/transaction.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import axios from 'axios';
import * as crypto from 'crypto';

export const PACKS: Record<number, { name: string, price: number, credits: number }> = {
  1: { name: 'Start AI', price: 2.49, credits: 750 },
  2: { name: 'AI Explorer', price: 4.99, credits: 2000 },
  3: { name: 'Pro Creator', price: 9.99, credits: 5000 },
  4: { name: 'AI Master', price: 18.99, credits: 10000 },
  5: { name: 'Unlimited Power', price: 29.99, credits: 20000 },
  6: { name: 'AI Titan', price: 49.99, credits: 45000 },
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

    const transaction = this.transactionRepo.create({
      user: { id: userId },
      amount: pack.price,
      creditsAmount: pack.credits,
      packId: packId,
      status: TransactionStatus.PENDING,
      provider: 'NOWPAYMENTS',
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

  async updateTransactionStatus(txId: number, newStatus: TransactionStatus, adminId: number) {
    const transaction = await this.transactionRepo.findOne({ 
        where: { id: txId },
        relations: ['user'] 
    });

    if (!transaction) throw new NotFoundException('Transaction not found.');

    transaction.status = newStatus;
    await this.transactionRepo.save(transaction);

    if (newStatus === TransactionStatus.APPROVED) {
        await this.finalizeTransaction(transaction);
    }

    return { status: 'success', newStatus };
  }

  private async finalizeTransaction(transaction: Transaction) {
    transaction.status = TransactionStatus.APPROVED;
    await this.transactionRepo.save(transaction);

    const buyer = await this.usersService.findOneById(transaction.user.id);
    if (!buyer) return;

    await this.usersService.addCredits(buyer.id, Number(transaction.creditsAmount));

    try {
        await this.usersService.processReferralBonus(buyer.id, transaction.packId);
    } catch (error) {
        console.error('Affiliate bonus error:', error);
    }

    await this.notificationsService.create(
      buyer.id,
      'Payment Successful! ✅',
      `You have successfully purchased ${transaction.creditsAmount} credits.`,
      NotificationType.SYSTEM
    );
  }
}
