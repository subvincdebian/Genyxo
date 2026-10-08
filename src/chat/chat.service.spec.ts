import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "./chat.service";

import { ConfigService } from "@nestjs/config";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { UsersService } from "../users/users.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Message } from "./message.entity";
import { Conversation } from "./conversation.entity";

describe("ChatService", () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("mock-api-key") },
        },
        { provide: FalService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: getRepositoryToken(Message), useValue: {} },
        { provide: getRepositoryToken(Conversation), useValue: {} },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
