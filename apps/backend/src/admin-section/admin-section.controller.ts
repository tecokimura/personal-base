import { Controller, Get, Put, Body, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EmployeeAdminSection } from '@prisma/client';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { AdminSectionService } from './admin-section.service';
import { UpdateAdminSectionDto } from './dto/update-admin-section.dto';

@Controller()
@UseGuards(SessionGuard)
export class AdminSectionController {
  constructor(private readonly adminSectionService: AdminSectionService) {}

  @Get('employees/:employeeId/admin-section')
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ): Promise<EmployeeAdminSection | null> {
    return this.adminSectionService.get(this.toCtx(req), employeeId);
  }

  @Put('employees/:employeeId/admin-section')
  async upsert(
    @Req() req: AuthenticatedRequest,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: UpdateAdminSectionDto,
  ): Promise<EmployeeAdminSection> {
    return this.adminSectionService.upsert(this.toCtx(req), employeeId, dto);
  }

  private toCtx(req: AuthenticatedRequest): AuthContext {
    return {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
  }
}
