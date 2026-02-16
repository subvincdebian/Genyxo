import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisCacheModule } from '../common/redis-cache.module';
import { User } from './user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction]), 
    RedisCacheModule,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}