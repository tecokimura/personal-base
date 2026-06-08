import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';
import { AuthContext } from './authorization.service';
import { ScopeType, RoleType } from './constants';

/**
 * TENANT_ALL: all employees/orgs in the tenant are visible (HR_ADMIN, EXECUTIVE_VIEWER)
 * ORG_TREE:   only orgs in the user's ORGANIZATION_TREE scope(s) (MANAGER, ORG_ADMIN)
 * PRIMARY_ORG: only employees in the same primary org as the user (EMPLOYEE)
 *              orgId=null means the user has no primary org → can see only themselves
 */
export type OrgAccess =
  | { kind: 'TENANT_ALL' }
  | { kind: 'ORG_TREE'; orgIds: ReadonlySet<number> }
  | { kind: 'PRIMARY_ORG'; orgId: number | null };


@Injectable()
export class ScopeResolverService {
  constructor(
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly prisma: PrismaService,
  ) {}

  async resolveOrgAccess(ctx: AuthContext): Promise<OrgAccess> {
    const roles = await this.roleAssignmentService.getActiveRoles(ctx.userAccountId);

    // TENANT_ALL wins if user holds any role with TENANT_ALL scope
    const hasTenantAll = roles.some((r) => r.scopeType === ScopeType.TENANT_ALL);
    if (hasTenantAll) return { kind: 'TENANT_ALL' };

    // Collect ORGANIZATION_TREE scope org IDs across all roles
    const treeRootIds = roles
      .filter((r) => r.scopeType === ScopeType.ORGANIZATION_TREE)
      .map((r) => r.scopeId);

    if (treeRootIds.length > 0) {
      const orgIds = await this.collectDescendantIds(treeRootIds, ctx.tenantId);
      return { kind: 'ORG_TREE', orgIds };
    }

    // EMPLOYEE (SELF scope only): visible scope is same primary org
    const employeeId = await this.getEmployeeId(ctx.userAccountId);
    const orgId = employeeId ? await this.getPrimaryOrgId(employeeId, ctx.tenantId) : null;
    return { kind: 'PRIMARY_ORG', orgId };
  }

  /** Returns true if the given orgId is visible under the resolved access. */
  canAccessOrg(access: OrgAccess, orgId: number): boolean {
    if (access.kind === 'TENANT_ALL') return true;
    if (access.kind === 'ORG_TREE') return access.orgIds.has(orgId);
    // PRIMARY_ORG: org chart is fully visible to EMPLOYEE (see design doc)
    return true;
  }

  /** Returns true if the given orgId is in scope for employee-list filtering. */
  orgInEmployeeListScope(access: OrgAccess, orgId: number): boolean {
    if (access.kind === 'TENANT_ALL') return true;
    if (access.kind === 'ORG_TREE') return access.orgIds.has(orgId);
    if (access.kind === 'PRIMARY_ORG') return access.orgId === orgId;
    return false;
  }

  /**
   * WorkHistory 閲覧権限判定。
   *
   * 許可条件:
   *   - 本人
   *   - HR_ADMIN (全社・論理削除社員も可)
   *   - ORG_ADMIN (論理削除社員のみ可、通常社員は不可)
   *   - EXECUTIVE_VIEWER (通常社員のみ)
   *   - MANAGER (ORGANIZATION_TREE 配下、通常社員のみ)
   *   - EMPLOYEE (主所属が同じ同僚、通常社員のみ)
   */
  async canAccessEmployeeWorkHistory(
    ctx: AuthContext,
    targetEmployeeId: number,
  ): Promise<boolean> {
    // 1. Self
    if (ctx.employeeId === targetEmployeeId) return true;

    // 2. Tenant isolation: target must belong to same tenant
    const target = await this.prisma.employee.findFirst({
      where: { id: targetEmployeeId, tenantId: ctx.tenantId },
      select: { isDeleted: true },
    });
    if (!target) return false;

    const roles = await this.roleAssignmentService.getActiveRoles(ctx.userAccountId);
    const roleTypes = new Set(roles.map(r => r.roleType));

    // 3. Soft-deleted: only HR_ADMIN or ORG_ADMIN
    if (target.isDeleted) {
      return roleTypes.has(RoleType.HR_ADMIN) || roleTypes.has(RoleType.ORG_ADMIN);
    }

    // 4. HR_ADMIN
    if (roleTypes.has(RoleType.HR_ADMIN)) return true;

    // 5. EXECUTIVE_VIEWER
    if (roleTypes.has(RoleType.EXECUTIVE_VIEWER)) return true;

    // 6. MANAGER with ORGANIZATION_TREE scope
    const managerRoles = roles.filter(
      r => r.roleType === RoleType.MANAGER && r.scopeType === ScopeType.ORGANIZATION_TREE,
    );
    if (managerRoles.length > 0) {
      const rootIds = managerRoles.map(r => r.scopeId);
      const treeIds = await this.collectDescendantIds(rootIds, ctx.tenantId);
      const targetOrgIds = await this.getEmployeeActiveOrgIds(targetEmployeeId, ctx.tenantId);
      if (targetOrgIds.some(id => treeIds.has(id))) return true;
    }

    // 7. EMPLOYEE: same primary org (EMPLOYEE role required — ORG_ADMIN and others must not fall through here)
    if (roleTypes.has(RoleType.EMPLOYEE)) {
      const myPrimaryOrg = await this.getPrimaryOrgId(ctx.employeeId, ctx.tenantId);
      const targetPrimaryOrg = await this.getPrimaryOrgId(targetEmployeeId, ctx.tenantId);
      if (myPrimaryOrg !== null && myPrimaryOrg === targetPrimaryOrg) return true;
    }

    return false;
  }

  /**
   * 資格情報閲覧権限判定。テナント内全員が閲覧可能。
   */
  async canAccessQualification(ctx: AuthContext, targetEmployeeId: number): Promise<boolean> {
    const target = await this.prisma.employee.findFirst({
      where: { id: targetEmployeeId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    return target !== null;
  }

  /**
   * 資格情報編集権限判定（作成・更新・削除）。
   *
   * 許可条件:
   *   - 本人
   *   - HR_ADMIN
   *   - MANAGER (ORGANIZATION_TREE 配下の通常社員のみ)
   */
  async canEditQualification(ctx: AuthContext, targetEmployeeId: number): Promise<boolean> {
    return this.canAssistEditEmployeeWorkHistory(ctx, targetEmployeeId);
  }

  /**
   * 管理者専用セクション閲覧権限判定。
   *
   * 許可条件:
   *   - HR_ADMIN（本人を除く・論理削除社員も可）
   *   - MANAGER（ORGANIZATION_TREE 配下・本人を除く・通常社員のみ）
   * 本人は自分のセクションを閲覧不可。
   */
  async canAccessAdminSection(ctx: AuthContext, targetEmployeeId: number): Promise<boolean> {
    // Self cannot access own admin section
    if (ctx.employeeId === targetEmployeeId) return false;

    const target = await this.prisma.employee.findFirst({
      where: { id: targetEmployeeId, tenantId: ctx.tenantId },
      select: { isDeleted: true },
    });
    if (!target) return false;

    const roles = await this.roleAssignmentService.getActiveRoles(ctx.userAccountId);
    const roleTypes = new Set(roles.map((r) => r.roleType));

    if (roleTypes.has(RoleType.HR_ADMIN)) return true;

    if (target.isDeleted) return false;

    const managerRoles = roles.filter(
      (r) => r.roleType === RoleType.MANAGER && r.scopeType === ScopeType.ORGANIZATION_TREE,
    );
    if (managerRoles.length > 0) {
      const rootIds = managerRoles.map((r) => r.scopeId);
      const treeIds = await this.collectDescendantIds(rootIds, ctx.tenantId);
      const targetOrgIds = await this.getEmployeeActiveOrgIds(targetEmployeeId, ctx.tenantId);
      if (targetOrgIds.some((id) => treeIds.has(id))) return true;
    }

    return false;
  }

  /**
   * 管理者専用セクション編集権限判定。閲覧権限と同一条件。
   */
  async canEditAdminSection(ctx: AuthContext, targetEmployeeId: number): Promise<boolean> {
    return this.canAccessAdminSection(ctx, targetEmployeeId);
  }

  /**
   * WorkHistory 補助編集権限判定。
   *
   * 許可条件:
   *   - 本人
   *   - HR_ADMIN (全社員・論理削除社員も可)
   *   - MANAGER (ORGANIZATION_TREE 配下の通常社員のみ)
   */
  async canAssistEditEmployeeWorkHistory(
    ctx: AuthContext,
    targetEmployeeId: number,
  ): Promise<boolean> {
    // 1. Self
    if (ctx.employeeId === targetEmployeeId) return true;

    // 2. Tenant isolation
    const target = await this.prisma.employee.findFirst({
      where: { id: targetEmployeeId, tenantId: ctx.tenantId },
      select: { isDeleted: true },
    });
    if (!target) return false;

    const roles = await this.roleAssignmentService.getActiveRoles(ctx.userAccountId);
    const roleTypes = new Set(roles.map((r) => r.roleType));

    // 3. HR_ADMIN: all employees including soft-deleted
    if (roleTypes.has(RoleType.HR_ADMIN)) return true;

    // 4. Soft-deleted: only HR_ADMIN (already checked above)
    if (target.isDeleted) return false;

    // 5. MANAGER with ORGANIZATION_TREE scope covering target
    const managerRoles = roles.filter(
      (r) => r.roleType === RoleType.MANAGER && r.scopeType === ScopeType.ORGANIZATION_TREE,
    );
    if (managerRoles.length > 0) {
      const rootIds = managerRoles.map((r) => r.scopeId);
      const treeIds = await this.collectDescendantIds(rootIds, ctx.tenantId);
      const targetOrgIds = await this.getEmployeeActiveOrgIds(targetEmployeeId, ctx.tenantId);
      if (targetOrgIds.some((id) => treeIds.has(id))) return true;
    }

    return false;
  }

  // ── Private ──────────────────────────────────────────────

  private async collectDescendantIds(rootIds: number[], tenantId: number): Promise<Set<number>> {
    const allOrgs = await this.prisma.organization.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, parentOrganizationId: true },
    });

    const childrenMap = new Map<number, number[]>();
    for (const org of allOrgs) {
      if (org.parentOrganizationId !== null) {
        const siblings = childrenMap.get(org.parentOrganizationId) ?? [];
        siblings.push(org.id);
        childrenMap.set(org.parentOrganizationId, siblings);
      }
    }

    const result = new Set<number>();
    const queue = [...rootIds];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (result.has(id)) continue;
      result.add(id);
      const children = childrenMap.get(id) ?? [];
      queue.push(...children);
    }
    return result;
  }

  private async getEmployeeActiveOrgIds(employeeId: number, tenantId: number): Promise<number[]> {
    const employments = await this.prisma.employment.findMany({
      where: { employeeId, tenantId, endDate: null },
      select: { organizationId: true },
    });
    return employments.map(e => e.organizationId);
  }

  private async getEmployeeId(userAccountId: number): Promise<number | null> {
    const account = await this.prisma.userAccount.findFirst({
      where: { id: userAccountId },
      select: { employeeId: true },
    });
    return account?.employeeId ?? null;
  }

  private async getPrimaryOrgId(employeeId: number, tenantId: number): Promise<number | null> {
    const employment = await this.prisma.employment.findFirst({
      where: { employeeId, tenantId, endDate: null },
      select: { organizationId: true },
    });
    return employment?.organizationId ?? null;
  }
}
