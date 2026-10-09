import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { DataSource } from "typeorm";
import { RedisService } from "@liaoliaots/nestjs-redis";

describe("HealthController", () => {
  let controller: HealthController;

  const mockDataSource = {
    isInitialized: true,
    query: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  const mockRedisClient = {
    ping: jest.fn().mockResolvedValue("PONG"),
  };

  const mockRedisService = {
    getOrThrow: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("liveness", () => {
    it("should return status ok", () => {
      const res = controller.checkLiveness();
      expect(res.status).toBe("ok");
      expect(typeof res.uptime).toBe("number");
      expect(res.timestamp).toBeDefined();
    });
  });

  describe("readiness", () => {
    it("should return status ok when db and redis are up", async () => {
      const res = await controller.checkReadiness();
      expect(res.status).toBe("ok");
      expect(res.checks.database).toBe("up");
      expect(res.checks.redis).toBe("up");
    });

    it("should throw 503 when database fails", async () => {
      mockDataSource.query.mockRejectedValueOnce(
        new Error("DB Connection lost"),
      );
      await expect(controller.checkReadiness()).rejects.toThrow();
    });

    it("should throw 503 when redis fails", async () => {
      mockRedisClient.ping.mockRejectedValueOnce(new Error("Redis offline"));
      await expect(controller.checkReadiness()).rejects.toThrow();
    });

    it("should report queue status when emailQueue is provided", async () => {
      const mockQueue = { isPaused: jest.fn().mockResolvedValue(false) };
      const queueController = new HealthController(
        mockDataSource as any,
        mockRedisService as any,
        mockQueue as any,
      );

      const res = await queueController.checkReadiness();
      expect(res.checks.emailQueue).toBe("up");
    });
  });
});
