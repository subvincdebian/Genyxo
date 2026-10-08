import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "./admin.controller";

import { AdminService } from "./admin.service";
import { PaymentService } from "../payment/payment.service";

describe("AdminController", () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: {} },
        { provide: PaymentService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
