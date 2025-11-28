import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/role.enum';

import { PaymentService } from '../payment/payment.service'; 
import { TransactionStatus } from '../users/transaction.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly paymentService: PaymentService,) {}

  private checkAdmin(user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Access denied. You are not an administrator.');
    }
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('transactions')
  async getTransactions() {
    return this.adminService.getAllTransactions();
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
