import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity'; 
import { PaymentModule } from '../payment/payment.module';
import { SupportTicket } from '../support/support.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, SupportTicket]),
    PaymentModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
