import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Transaction } from '../users/transaction.entity';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config'; 

@Module({
  imports: [
    ConfigModule, 
    TypeOrmModule.forFeature([Transaction]),
    UsersModule
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService]
})
export class PaymentModule {}
