import { Test, TestingModule } from "@nestjs/testing";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

describe("MetricsController", () => {
  let controller: MetricsController;
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    service = module.get<MetricsService>(MetricsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it("should return prometheus metrics text", async () => {
    const metrics = await controller.getMetrics();
    expect(typeof metrics).toBe("string");
    expect(metrics).toContain("genyxo_");
  });
});
