import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BillingProfile } from "./billing-profile.entity";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { Transaction } from "../transactions/transaction.entity";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([BillingProfile, Transaction, User])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
