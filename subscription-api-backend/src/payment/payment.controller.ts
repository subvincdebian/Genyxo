import { Controller, Post, Body, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import { BuyPackDto } from './dto/payment.dto'; 

@Controller('payment')
@UseGuards(AuthGuard('jwt'))
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('buy')
  @HttpCode(HttpStatus.OK)
  // @Roles(Role.USER, Role.ADMIN) // Можна не вказувати, якщо це дефолтний доступ
  async buyPack(@Request() req, @Body() buyPackDto: BuyPackDto) {
    const userId = req.user.id;
    return this.paymentService.createPayment(userId, buyPackDto.packId, buyPackDto.paymentMethod);
  }
}
