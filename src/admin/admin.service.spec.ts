import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";

import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../users/user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { SupportTicket } from "../support/support.entity";
import { NotificationsService } from "../notifications/notifications.service";

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(SupportTicket), useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
