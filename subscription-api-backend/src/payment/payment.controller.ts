import { Controller, Post, Body, UseGuards, Request, HttpStatus, HttpCode, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('buy')
  @HttpCode(HttpStatus.OK)
  async buyPack(@Request() req, @Body() body: { packId: number }) {
    return this.paymentService.createPayment(req.user.id, body.packId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Headers() headers, @Body() payload: any) {
    return this.paymentService.handleWebhook(headers, payload);
  }
}
