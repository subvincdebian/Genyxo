import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../users/role.enum";
import { AuditService } from "./audit.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Audit")
@ApiBearerAuth("JWT-auth")
@Controller("are-you-sure-you-want-to-admin/audit-logs")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({ summary: "Query immutable audit logs" })
  @Get()
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(":id")
  async getAuditLogById(@Param("id") id: string) {
    const log = await this.auditService.findById(id);
    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found.`);
    }
    return log;
  }
}
