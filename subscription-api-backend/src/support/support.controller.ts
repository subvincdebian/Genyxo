import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../users/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('support')
@UseGuards(AuthGuard('jwt'))
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('create')
  async createTicket(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.create(req.user.id, dto.subject, dto.message, dto.priority);
  }

  @Get('my-tickets')
  async getMyTickets(@Request() req) {
    return this.supportService.getUserTickets(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  async getAllTickets(@Query() paginationQuery: PaginationQueryDto) {
    return this.supportService.getAllTickets(paginationQuery);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/resolve')
  async resolveTicket(@Body() dto: ResolveTicketDto) {
    return this.supportService.resolveTicket(dto.ticketId, dto.response);
  }
}
