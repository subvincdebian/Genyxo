import { Test, TestingModule } from "@nestjs/testing";
import { PaymentController } from "./payment.controller";

import { PaymentService } from "./payment.service";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor";

describe("PaymentController", () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: {} }],
    })
      .overrideInterceptor(IdempotencyInterceptor)
      .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
