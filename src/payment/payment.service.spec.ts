import { Test, TestingModule } from "@nestjs/testing";
import { PaymentService } from "./payment.service";

import { getRepositoryToken } from "@nestjs/typeorm";
import { Transaction } from "../transactions/transaction.entity";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ConfigService } from "@nestjs/config";

describe("PaymentService", () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("test-val") },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
