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

const EMPLOYMENT_STATUS_ACTIVE = 1;

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

  private async getEmployeeId(userAccountId: number): Promise<number | null> {
    const account = await this.prisma.userAccount.findFirst({
      where: { id: userAccountId },
      select: { employeeId: true },
    });
    return account?.employeeId ?? null;
  }

  private async getPrimaryOrgId(employeeId: number, tenantId: number): Promise<number | null> {
    const employment = await this.prisma.employment.findFirst({
      where: { employeeId, tenantId, isPrimaryAssignment: true, status: EMPLOYMENT_STATUS_ACTIVE },
      select: { organizationId: true },
    });
    return employment?.organizationId ?? null;
  }
}
