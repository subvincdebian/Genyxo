import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { MetricsService } from "../../metrics/metrics.service";

describe("CircuitBreakerService", () => {
  let service: CircuitBreakerService;

  const mockMetricsService = {
    circuitBreakerState: { set: jest.fn() },
    circuitBreakerCallsTotal: { inc: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    service.shutdown();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should execute action successfully when circuit is closed", async () => {
    const action = jest.fn().mockResolvedValue("success-result");

    const result = await service.execute("test-breaker", action);

    expect(result).toBe("success-result");
    expect(action).toHaveBeenCalledTimes(1);
    expect(
      mockMetricsService.circuitBreakerCallsTotal.inc,
    ).toHaveBeenCalledWith({
      name: "test-breaker",
      status: "success",
    });
  });

  it("should return correct status for registered breaker", async () => {
    await service.execute("status-breaker", async () => "ok");

    const status = service.getStatus("status-breaker");
    expect(status).toBeDefined();
    expect(status?.name).toBe("status-breaker");
    expect(status?.state).toBe("CLOSED");
    expect(status?.stats.successes).toBeGreaterThanOrEqual(1);
  });

  it("should return all statuses", async () => {
    await service.execute("breaker-1", async () => 1);
    await service.execute("breaker-2", async () => 2);

    const statuses = service.getAllStatuses();
    expect(statuses.length).toBe(2);
    expect(statuses.map((s) => s.name)).toEqual(
      expect.arrayContaining(["breaker-1", "breaker-2"]),
    );
  });

  it("should trip open after exceeding failure threshold and fail fast", async () => {
    const failingAction = jest
      .fn()
      .mockRejectedValue(new Error("Upstream outage"));

    const options = {
      timeout: 1000,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
      volumeThreshold: 2,
    };

    // First failure
    await expect(
      service.execute("failing-service", failingAction, undefined, options),
    ).rejects.toThrow("Upstream outage");

    // Second failure - trips breaker
    await expect(
      service.execute("failing-service", failingAction, undefined, options),
    ).rejects.toThrow("Upstream outage");

    const breaker = service.getBreaker("failing-service");
    // Circuit should now be open
    expect(breaker.opened).toBe(true);

    // Next call should be rejected immediately with ServiceUnavailableException
    await expect(
      service.execute("failing-service", failingAction, undefined, options),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("should invoke fallback when breaker rejects execution", async () => {
    const failingAction = jest
      .fn()
      .mockRejectedValue(new Error("Service down"));

    const fallback = jest.fn().mockReturnValue("fallback-result");

    const options = {
      timeout: 500,
      errorThresholdPercentage: 1,
      resetTimeout: 10000,
      volumeThreshold: 1,
    };

    // Trip the breaker
    await expect(
      service.execute("fallback-service", failingAction, undefined, options),
    ).rejects.toThrow();

    // Call with fallback
    const result = await service.execute(
      "fallback-service",
      failingAction,
      fallback,
      options,
    );

    expect(result).toBe("fallback-result");
  });
});
