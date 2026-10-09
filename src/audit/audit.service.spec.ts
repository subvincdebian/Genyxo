import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "./audit.service";
import { AuditLog, AuditAction } from "./entities/audit-log.entity";

describe("AuditService", () => {
  let service: AuditService;
  let _repo: Repository<AuditLog>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    _repo = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("record", () => {
    it("should safely create and save an audit log", async () => {
      const entry = {
        action: AuditAction.CREDITS_MANUAL_ADD,
        actorId: 1,
        userId: 42,
        resource: "users",
        resourceId: "42",
        oldValues: { credits: 10 },
        newValues: { credits: 20 },
      };

      const savedEntity = { id: "uuid-123", ...entry, status: "SUCCESS" };
      mockRepo.create.mockReturnValue(savedEntity);
      mockRepo.save.mockResolvedValue(savedEntity);

      const result = await service.record(entry);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CREDITS_MANUAL_ADD,
          status: "SUCCESS",
        }),
      );
      expect(mockRepo.save).toHaveBeenCalledWith(savedEntity);
      expect(result).toEqual(savedEntity);
    });

    it("should return null and not throw if repository save fails", async () => {
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(new Error("DB Connection Error"));

      const result = await service.record({ action: AuditAction.AUTH_LOGIN });

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return paginated audit logs with metadata", async () => {
      const logs = [{ id: "uuid-1" }, { id: "uuid-2" }];
      mockRepo.findAndCount.mockResolvedValue([logs, 2]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        action: AuditAction.CREDITS_MANUAL_ADD,
      });

      expect(result).toEqual({
        items: logs,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: AuditAction.CREDITS_MANUAL_ADD },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe("findById", () => {
    it("should find an audit log by uuid", async () => {
      mockRepo.findOne.mockResolvedValue({ id: "uuid-1" });

      const result = await service.findById("uuid-1");

      expect(result).toEqual({ id: "uuid-1" });
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: "uuid-1" },
      });
    });
  });
});
