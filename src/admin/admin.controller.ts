import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException, HttpStatus, HttpCode, Query, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { join } from 'path';
import { Role } from '../users/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { TransactionStatus } from '../transactions/transaction.entity';
import { AdminService } from './admin.service';
import { PaymentService } from '../payment/payment.service'; 
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('are-you-sure-you-want-to-admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
      private readonly adminService: AdminService, 
      private readonly paymentService: PaymentService
  ) {}

  private checkAdmin(user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Access denied. You are not an administrator.');
    }
  }

  @Get('panel')
  async getAdminPanel(@Res() res: Response) {
    const filePath = join(process.cwd(), 'secure_html', 'admin.html');
    return res.sendFile(filePath);
  }

  @Get('users')
  async getUsers(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminService.getAllUsers(paginationQuery);
  }

  @Get('transactions')
  async getTransactions(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminService.getAllTransactions(paginationQuery);
  }

  @Get('tickets')
  async getTickets(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminService.getAllTickets(paginationQuery);
  }

  @Post('add-credits')
  async addCredits(@Request() req, @Body() body: { userId: number, amount: number }) {
    this.checkAdmin(req.user);
    return this.adminService.manualAddCredits(body.userId, body.amount);
  }

  @Post('approve-transaction')
  @HttpCode(HttpStatus.OK)
  async approveTransaction(@Request() req, @Body() body: { txId: number }) {
    return this.paymentService.updateTransactionStatus(body.txId, TransactionStatus.APPROVED, req.user.id);
  }

  @Post('decline-transaction')
  @HttpCode(HttpStatus.OK)
  async declineTransaction(@Request() req, @Body() body: { txId: number }) {
    return this.paymentService.updateTransactionStatus(body.txId, TransactionStatus.DECLINED, req.user.id);
  }
}
