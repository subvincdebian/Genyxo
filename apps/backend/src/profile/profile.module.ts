import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ProfileController } from "./profile.controller";
import { UsersModule } from "../users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { ProfileService } from "./profile.service";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([User, Transaction]),
  ],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}
