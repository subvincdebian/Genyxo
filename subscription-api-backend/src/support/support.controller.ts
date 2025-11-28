import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/role.enum';

@Controller('support')
@UseGuards(AuthGuard('jwt'))
export class SupportController {
  constructor(private supportService: SupportService) {}

  // ЮЗЕР: Створити
  @Post('create')
  async createTicket(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.create(req.user.id, dto.subject, dto.message);
  }

  // ЮЗЕР: Мої тікети
  @Get('my-tickets')
  async getMyTickets(@Request() req) {
    return this.supportService.getUserTickets(req.user.id);
  }

  // АДМІН: Всі тікети
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  async getAllTickets() {
    return this.supportService.getAllTickets();
  }

  // АДМІН: Відповісти
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/resolve')
  async resolveTicket(@Body() dto: ResolveTicketDto) {
    return this.supportService.resolveTicket(dto.ticketId, dto.response);
  }
}
