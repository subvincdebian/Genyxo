import { Test, TestingModule } from "@nestjs/testing";
import { ChatController } from "./chat.controller";

import { ChatService } from "./chat.service";
import { UsersService } from "../users/users.service";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { ConfigService } from "@nestjs/config";

describe("ChatController", () => {
  let controller: ChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: FalService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
