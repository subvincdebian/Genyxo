import { AuthSession } from "./auth-session.entity";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { UsersService } from "./users.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, AuthSession])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
