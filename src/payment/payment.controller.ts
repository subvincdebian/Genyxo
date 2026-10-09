import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Headers,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SkipThrottle } from "@nestjs/throttler";
import { PaymentService } from "./payment.service";
import { BuyPackDto } from "./dto/payment.dto";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor";
import { Idempotent } from "../common/decorators/idempotent.decorator";

@Controller("payment")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent({ required: false, ttlSeconds: 86400 })
  @Post("buy")
  @HttpCode(HttpStatus.OK)
  async buyPack(@Request() req, @Body() buyPackDto: BuyPackDto) {
    return this.paymentService.createPayment(req.user.id, buyPackDto.packId);
  }

  @SkipThrottle()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(@Headers() headers, @Body() payload: any) {
    return this.paymentService.handleWebhook(headers, payload);
  }
}
