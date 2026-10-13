import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Safely records an audit log entry.
   * Catches errors internally to prevent failing the primary user operation.
   */
  async record(entry: Partial<AuditLog>): Promise<AuditLog | null> {
    try {
      const log = this.auditRepository.create({
        status: "SUCCESS",
        ...entry,
      });
      return await this.auditRepository.save(log);
    } catch (err: any) {
      this.logger.error(
        `Failed to persist audit log [${entry.action ?? "UNKNOWN"}]: ${err.message}`,
        err.stack,
      );
      return null;
    }
  }

  /**
   * Fetches paginated audit logs with optional filtering.
   */
  async findAll(query: AuditLogQueryDto): Promise<{
    items: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (query.action) where.action = query.action;
    if (query.actorId) where.actorId = query.actorId;
    if (query.userId) where.userId = query.userId;
    if (query.resource) where.resource = query.resource;
    if (query.status) where.status = query.status;

    const [items, total] = await this.auditRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.auditRepository.findOne({ where: { id } });
  }
}
