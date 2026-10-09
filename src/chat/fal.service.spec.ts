import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FalService } from "./fal.service";
import { CircuitBreakerService } from "../common/resilience/circuit-breaker.service";
import { CIRCUIT_BREAKER_NAMES } from "../common/resilience/circuit-breaker.constants";

jest.mock("@fal-ai/client", () => ({
  fal: {
    queue: {
      submit: jest.fn().mockResolvedValue({ request_id: "req-123" }),
    },
  },
}));

describe("FalService", () => {
  let service: FalService;
  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === "FAL_KEY") return "fal-key";
      if (key === "SITE_URL") return "https://genyxo.com";
      if (key === "WEBHOOK_SECRET") return "secret";
      return null;
    }),
  };

  const mockCircuitBreaker = {
    execute: jest.fn().mockImplementation((name, fn) => fn()),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FalService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
      ],
    }).compile();

    service = module.get<FalService>(FalService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should trigger video generation wrapped by circuit breaker", async () => {
    const requestId = await service.triggerVideoGeneration(
      "cat playing piano",
      "fast-svd",
    );
    expect(requestId).toBe("req-123");
    expect(mockCircuitBreaker.execute).toHaveBeenCalledWith(
      CIRCUIT_BREAKER_NAMES.FAL_AI,
      expect.any(Function),
    );
  });
});
