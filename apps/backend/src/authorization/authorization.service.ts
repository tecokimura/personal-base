import { Injectable, ForbiddenException } from '@nestjs/common';
import { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';
import { Permission, RoleType } from './constants';

export interface AuthContext {
  userAccountId: number;
  tenantId: number;
}

const ROLE_PERMISSIONS: Record<number, readonly Permission[]> = {
  [RoleType.HR_ADMIN]: [
    Permission.MANAGE_EMPLOYEE,
    Permission.VIEW_ALL_EMPLOYEES,
    Permission.VIEW_ORG_TREE,
    Permission.MANAGE_SOFT_DELETED,
    Permission.MANAGE_ROLE_ASSIGNMENTS,
    Permission.MANAGE_ORGANIZATION,
  ],
  [RoleType.MANAGER]: [Permission.VIEW_ORG_TREE, Permission.ASSIST_UPDATE_PROFILE],
  [RoleType.ORG_ADMIN]: [Permission.VIEW_ORG_TREE, Permission.MANAGE_SOFT_DELETED],
  [RoleType.EXECUTIVE_VIEWER]: [Permission.VIEW_ALL_EMPLOYEES, Permission.VIEW_ORG_TREE],
  [RoleType.EMPLOYEE]: [],
};

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

  async can(
    ctx: AuthContext,
    permission: Permission,
    targetTenantId: number,
  ): Promise<boolean> {
    if (ctx.tenantId !== targetTenantId) {
      return false;
    }

    const roles = await this.roleAssignmentService.getActiveRoles(
      ctx.userAccountId,
    );

    return roles.some((role) =>
      (ROLE_PERMISSIONS[role.roleType] ?? []).includes(permission),
    );
  }

  async assertCan(
    ctx: AuthContext,
    permission: Permission,
    targetTenantId: number,
  ): Promise<void> {
    const allowed = await this.can(ctx, permission, targetTenantId);
    if (!allowed) {
      throw new ForbiddenException();
    }
  }
}
