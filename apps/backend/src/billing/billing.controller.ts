import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { BillingProfileDto, SetupConfirmDto } from "./billing.dto";

@ApiTags("billing")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("details")
  details(@Request() req) {
    return this.billing.details(req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Put("details")
  saveDetails(@Request() req, @Body() body: BillingProfileDto) {
    return this.billing.saveDetails(req.user.id, body, req.ip);
  }

  @Get("purchases")
  purchases(@Request() req) {
    return this.billing.purchases(req.user.id);
  }

  @Get("payment-methods")
  paymentMethods(@Request() req) {
    return this.billing.paymentMethods(req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("payment-methods/setup")
  startSetup(@Request() req) {
    return this.billing.startSetup(req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("payment-methods/confirm")
  confirmSetup(@Request() req, @Body() body: SetupConfirmDto) {
    return this.billing.confirmSetup(req.user.id, body.setupIntentId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post("payment-methods/:id/default")
  makeDefault(@Request() req, @Param("id") id: string) {
    return this.billing.makeDefault(req.user.id, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Delete("payment-methods/:id")
  remove(@Request() req, @Param("id") id: string) {
    return this.billing.remove(req.user.id, id);
  }
}
