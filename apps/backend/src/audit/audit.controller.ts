import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { LoginHistory, EditHistory } from '@prisma/client';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/constants';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@UseGuards(SessionGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('login-history')
  async listLoginHistory(@Req() req: AuthenticatedRequest): Promise<LoginHistory[]> {
    const ctx = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(ctx, Permission.VIEW_AUDIT_LOGS, ctx.tenantId);
    return this.auditService.listLoginHistory(ctx.tenantId);
  }

  @Get('edit-history')
  async listEditHistory(@Req() req: AuthenticatedRequest): Promise<EditHistory[]> {
    const ctx = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(ctx, Permission.VIEW_AUDIT_LOGS, ctx.tenantId);
    return this.auditService.listEditHistory(ctx.tenantId);
  }
}
