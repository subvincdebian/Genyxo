import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  HttpStatus,
  HttpCode,
  Query,
  Res,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { FastifyReply } from "fastify";
import { frontendUrl } from "../common/frontend-url";
import { Role } from "../users/role.enum";
import { Roles } from "../auth/decorators/roles.decorator";
import { TransactionStatus } from "../transactions/transaction.entity";
import { AdminService } from "./admin.service";
import { PaymentService } from "../payment/payment.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor";
import { Idempotent } from "../common/decorators/idempotent.decorator";

import { AdminAddCreditsDto } from "./dto/admin-add-credits.dto";
import { AdminTransactionActionDto } from "./dto/admin-transaction-action.dto";

@Controller("are-you-sure-you-want-to-admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentService: PaymentService,
  ) {}

  private checkAdmin(user: any) {
    if (user.role !== "admin") {
      throw new ForbiddenException(
        "Access denied. You are not an administrator.",
      );
    }
  }

  @Get("panel")
  async getAdminPanel(@Res({ passthrough: false }) res: FastifyReply) {
    return res.redirect(frontendUrl("/admin").href, HttpStatus.FOUND);
  }

  @Get("users")
  async getUsers(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminService.getAllUsers(paginationQuery);
  }

  @Get("transactions")
  async getTransactions(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminService.getAllTransactions(paginationQuery);
  }

  @Get("tickets")
  async getTickets(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminService.getAllTickets(paginationQuery);
  }

  @Post("add-credits")
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent({ required: false, ttlSeconds: 86400 })
  async addCredits(@Request() req, @Body() dto: AdminAddCreditsDto) {
    this.checkAdmin(req.user);
    return this.adminService.manualAddCredits(
      dto.userId,
      dto.amount,
      req.user.id,
    );
  }

  @Post("approve-transaction")
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent({ required: false, ttlSeconds: 86400 })
  @HttpCode(HttpStatus.OK)
  async approveTransaction(
    @Request() req,
    @Body() dto: AdminTransactionActionDto,
  ) {
    return this.paymentService.updateTransactionStatus(
      dto.txId,
      TransactionStatus.APPROVED,
      req.user.id,
    );
  }

  @Post("decline-transaction")
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent({ required: false, ttlSeconds: 86400 })
  @HttpCode(HttpStatus.OK)
  async declineTransaction(
    @Request() req,
    @Body() dto: AdminTransactionActionDto,
  ) {
    return this.paymentService.updateTransactionStatus(
      dto.txId,
      TransactionStatus.DECLINED,
      req.user.id,
    );
  }
}
