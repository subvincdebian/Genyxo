import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import * as crypto from "crypto";
import * as https from "https";
import { ConfigService } from "@nestjs/config";

const paymentHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  timeout: 30000,
});
import {
  Transaction,
  TransactionStatus,
} from "../transactions/transaction.entity";
import { User } from "../users/user.entity";
import { NotificationType } from "../notifications/notification.entity";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { frontendUrl } from "../common/frontend-url";

export const PACKS: Record<
  number,
  { name: string; price: number; credits: number }
> = {
  1: { name: "Start AI", price: 3.99, credits: 750 },
  2: { name: "AI Explorer", price: 9.99, credits: 2000 },
  3: { name: "Pro Creator", price: 24.99, credits: 5000 },
  4: { name: "AI Master", price: 49.99, credits: 10000 },
  5: { name: "Unlimited Power", price: 99.99, credits: 20000 },
  6: { name: "AI Titan", price: 219.99, credits: 45000 },
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

  async createPayment(userId: number, packId: number) {
    const pack = PACKS[packId];
    if (!pack) throw new BadRequestException("Package not found");

    const transaction = this.transactionRepo.create({
      userId,
      amount: pack.price,
      creditsAmount: pack.credits,
      packId,
      status: TransactionStatus.PENDING,
      provider: "NOWPAYMENTS",
    });

    const savedTx = await this.transactionRepo.save(transaction);

    try {
      const response = await axios.post(
        process.env.NOWPAYMENTS_API_URL!,
        {
          price_amount: pack.price,
          price_currency: "usd",
          order_id: savedTx.id.toString(),
          order_description: `Purchase: ${pack.name}`,
          ipn_callback_url: this.configService.get<string>(
            "NOWPAYMENTS_IPN_URL",
          ),
          success_url: frontendUrl("/#success").href,
          cancel_url: frontendUrl("/#cancel").href,
        },
        {
          headers: {
            "x-api-key": this.configService.get<string>("NOWPAYMENTS_API_KEY"),
            "Content-Type": "application/json",
          },
          httpsAgent: paymentHttpsAgent,
          timeout: 15000,
        },
      );

      const externalId = response.data.payment_id || response.data.id;
      if (externalId) {
        await this.transactionRepo.update(savedTx.id, { externalId });
      }

      return { url: response.data.invoice_url };
    } catch (error: any) {
      this.logger.error(
        "NowPayments Create Error:",
        error.response?.data || error.message,
      );
      throw new BadRequestException("Payment gateway error");
    }
  }

  async handleWebhook(headers: any, body: any) {
    const signature = headers["x-nowpayments-sig"];
    const ipnSecret =
      this.configService.get<string>("NOWPAYMENTS_IPN_SECRET") ||
      process.env.NOWPAYMENTS_IPN_SECRET;
    if (!signature || !ipnSecret) {
      this.logger.error("Missing signature or IPN secret configuration");
      throw new BadRequestException("Invalid signature configuration");
    }

    const sortedKeys = Object.keys(body).sort();
    const jsonString = sortedKeys.map((key) => `${key}=${body[key]}`).join("&");
    const hmac = crypto.createHmac("sha512", ipnSecret);
    const calculatedSignature = hmac.update(jsonString).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const calcBuf = Buffer.from(calculatedSignature, "hex");

    if (
      sigBuf.length !== calcBuf.length ||
      !crypto.timingSafeEqual(sigBuf, calcBuf)
    ) {
      this.logger.error("Invalid signature");
      throw new BadRequestException("Invalid signature");
    }

    const txId = Number(body.order_id);
    const status = body.payment_status;

    const transaction = await this.transactionRepo.findOne({
      where: { id: txId },
      select: ["id", "status"],
    });

    if (!transaction) return;

    if (status === "finished" || status === "confirmed") {
      if (transaction.status !== TransactionStatus.APPROVED) {
        await this.finalizeTransaction(txId);
      }
    } else if (
      status === "failed" ||
      status === "expired" ||
      status === "rejected"
    ) {
      await this.transactionRepo.update(txId, {
        status: TransactionStatus.DECLINED,
      });
    } else {
      await this.transactionRepo.update(txId, {
        status: TransactionStatus.WAITING,
      });
    }

    return { status: "ok" };
  }

  async updateTransactionStatus(
    txId: number,
    newStatus: TransactionStatus,
    adminId: number,
  ) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: txId },
      select: ["id", "status"],
    });

    if (!transaction) throw new NotFoundException("Transaction not found.");

    if (newStatus === TransactionStatus.APPROVED) {
      await this.finalizeTransaction(txId);
    } else {
      await this.transactionRepo.update(txId, { status: newStatus });
    }

    this.logger.log(
      `Transaction ${txId} status updated to ${newStatus} by admin ${adminId}`,
    );

    return { status: "success", newStatus };
  }

  private async finalizeTransaction(txId: number) {
    const finalizationData = await this.transactionRepo.manager.transaction(
      async (manager) => {
        const transaction = await manager.findOne(Transaction, {
          where: { id: txId },
          relations: {
            user: true,
          },
          select: {
            id: true,
            status: true,
            creditsAmount: true,
            packId: true,
            userId: true,
            user: {
              id: true,
            },
          },
          lock: { mode: "pessimistic_write" },
        });

        if (!transaction || transaction.status === TransactionStatus.APPROVED) {
          return null;
        }

        const user = transaction.user;
        if (!user) throw new Error("User not found for transaction");

        await manager.update(Transaction, txId, {
          status: TransactionStatus.APPROVED,
        });

        await manager.increment(
          User,
          { id: user.id },
          "credits",
          transaction.creditsAmount,
        );

        return {
          userId: user.id,
          creditsAmount: transaction.creditsAmount,
          packId: transaction.packId,
        };
      },
    );

    if (!finalizationData) {
      return;
    }

    await Promise.all([
      this.usersService.invalidateUserCache(finalizationData.userId),
      finalizationData.packId
        ? this.usersService.processReferralBonus(
            finalizationData.userId,
            finalizationData.packId,
          )
        : Promise.resolve(),
      this.notificationsService.create(
        finalizationData.userId,
        "Payment Successful! ✅",
        `You have successfully purchased ${finalizationData.creditsAmount} credits.`,
        NotificationType.SYSTEM,
      ),
    ]);
  }
}
