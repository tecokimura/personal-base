import { Injectable, ForbiddenException } from '@nestjs/common';
import { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';
import { AuthContext } from '../authorization/authorization.service';
import { RoleType, ScopeType } from '../authorization/constants';
import { ManagerMemberDto, ManagerRepository } from './manager.repository';

@Injectable()
export class ManagerService {
  constructor(
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly managerRepository: ManagerRepository,
  ) {}

  async getMyMembers(ctx: AuthContext): Promise<ManagerMemberDto[]> {
    const roles = await this.roleAssignmentService.getActiveRoles(ctx.userAccountId);
    const managerRoles = roles.filter(
      (r) => r.roleType === RoleType.MANAGER && r.scopeType === ScopeType.ORGANIZATION_TREE,
    );
    if (managerRoles.length === 0) throw new ForbiddenException();

    const rootIds = managerRoles.map((r) => r.scopeId);
    const orgIds = await this.managerRepository.collectDescendantOrgIds(rootIds, ctx.tenantId);

    const employees = await this.managerRepository.findEmployeesInOrgs(ctx.tenantId, orgIds);
    if (employees.length === 0) return [];

    const employeeIds = employees.map((e) => e.id);
    const excludedIds = await this.managerRepository.findEmployeeIdsWithExcludedRoles(
      ctx.tenantId,
      employeeIds,
    );

    return employees.filter((e) => !excludedIds.has(e.id));
  }
}
