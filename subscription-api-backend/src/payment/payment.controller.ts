import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Headers,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PaymentService } from "./payment.service";
import { BuyPackDto } from "./dto/payment.dto";

@Controller("payment")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post("buy")
  @HttpCode(HttpStatus.OK)
  async buyPack(@Request() req, @Body() buyPackDto: BuyPackDto) {
    return this.paymentService.createPayment(req.user.id, buyPackDto.packId);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(@Headers() headers, @Body() payload: any) {
    return this.paymentService.handleWebhook(headers, payload);
  }
}
