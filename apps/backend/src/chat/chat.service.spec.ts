import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "./chat.service";

import { ConfigService } from "@nestjs/config";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { UsersService } from "../users/users.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Message } from "./message.entity";
import { Conversation } from "./conversation.entity";
import { CircuitBreakerService } from "../common/resilience/circuit-breaker.service";

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

  it("should use circuit breaker when provided", async () => {
    const mockCircuitBreaker = {
      execute: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Protected AI response" } }],
      }),
    };

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
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
      ],
    }).compile();

    const protectedService = module.get<ChatService>(ChatService);
    const result = await protectedService.getAiResponse(
      [{ id: 1, content: "Hello", sender: "user", conversationId: 1 } as any],
      "openai/gpt-4o",
    );

    expect(result.reply).toBe("Protected AI response");
    expect(mockCircuitBreaker.execute).toHaveBeenCalled();
  });
});
