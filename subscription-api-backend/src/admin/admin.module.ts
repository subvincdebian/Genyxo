import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { SupportTicket } from '../support/support.entity';
import { PaymentModule } from '../payment/payment.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, SupportTicket]),
    PaymentModule,
    NotificationsModule,
  ],
  providers: [AdminService, RolesGuard],
  controllers: [AdminController],
})
export class AdminModule {}
