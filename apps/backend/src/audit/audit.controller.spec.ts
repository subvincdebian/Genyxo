import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

describe("AuditController", () => {
  let controller: AuditController;
  let _service: AuditService;

  const mockAuditService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    _service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getAuditLogs", () => {
    it("should return paginated audit logs from service", async () => {
      const response = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockAuditService.findAll.mockResolvedValue(response);

      const result = await controller.getAuditLogs({ page: 1, limit: 10 });
      expect(result).toEqual(response);
      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe("getAuditLogById", () => {
    it("should return audit log when found", async () => {
      const log = { id: "uuid-123" };
      mockAuditService.findById.mockResolvedValue(log);

      const result = await controller.getAuditLogById("uuid-123");
      expect(result).toEqual(log);
    });

    it("should throw NotFoundException when log is not found", async () => {
      mockAuditService.findById.mockResolvedValue(null);

      await expect(controller.getAuditLogById("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
