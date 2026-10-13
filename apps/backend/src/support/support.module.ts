import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SupportTicket } from "./support.entity";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { EmailModule } from "../email/email.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket]),
    NotificationsModule,
    EmailModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
