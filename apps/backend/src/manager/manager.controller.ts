import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { ManagerMemberDto } from './manager.repository';
import { ManagerService } from './manager.service';

@Controller('manager')
@UseGuards(SessionGuard)
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('my-members')
  getMyMembers(@Req() req: AuthenticatedRequest): Promise<ManagerMemberDto[]> {
    return this.managerService.getMyMembers(this.toCtx(req));
  }

  private toCtx(req: AuthenticatedRequest): AuthContext {
    return {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
  }
}
