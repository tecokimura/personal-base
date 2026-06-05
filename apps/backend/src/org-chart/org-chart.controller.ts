import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { OrgChartService } from './org-chart.service';

@Controller('org-chart')
@UseGuards(SessionGuard)
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get('tree')
  getTree(@Req() req: AuthenticatedRequest) {
    return this.service.getTree(this.ctx(req));
  }

  @Get('unassigned')
  getUnassigned(@Req() req: AuthenticatedRequest) {
    return this.service.getUnassignedMembers(this.ctx(req));
  }

  @Get('organizations/:id')
  getDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getOrganizationDetail(id, this.ctx(req));
  }

  @Get('organizations/:id/members')
  getMembers(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getMembers(id, this.ctx(req));
  }

  private ctx(req: AuthenticatedRequest): AuthContext {
    return { userAccountId: req.userAccount.id, employeeId: req.userAccount.employeeId, tenantId: req.userAccount.tenantId };
  }
}
