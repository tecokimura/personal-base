import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScopeResolverService } from './scope-resolver.service';
import { ScopeType } from './constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';

const ctx = { userAccountId: 99, tenantId: 1 };

const makeRole = (scopeType: number, scopeId: number | null = null) => ({
  id: 1,
  userAccountId: 99,
  tenantId: 1,
  roleType: 1,
  scopeType,
  scopeId,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ScopeResolverService', () => {
  let service: ScopeResolverService;
  let roleAssignmentService: Record<string, ReturnType<typeof vi.fn>>;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    roleAssignmentService = {
      getActiveRoles: vi.fn().mockResolvedValue([]),
    };

    prisma = {
      organization: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      userAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      employment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    service = new ScopeResolverService(
      roleAssignmentService as unknown as RoleAssignmentService,
      prisma as unknown as PrismaService,
    );
  });

  // ── resolveOrgAccess ──────────────────────────────────────

  describe('resolveOrgAccess', () => {
    it('returns TENANT_ALL for user with TENANT_ALL scope role', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([makeRole(ScopeType.TENANT_ALL)]);

      const result = await service.resolveOrgAccess(ctx);

      expect(result.kind).toBe('TENANT_ALL');
    });

    it('TENANT_ALL wins even when other scope roles exist', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 5),
        makeRole(ScopeType.TENANT_ALL),
      ]);

      const result = await service.resolveOrgAccess(ctx);

      expect(result.kind).toBe('TENANT_ALL');
    });

    it('returns ORG_TREE with descendant org IDs for ORGANIZATION_TREE role', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([makeRole(ScopeType.ORGANIZATION_TREE, 10)]);
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
        { id: 11, parentOrganizationId: 10 },
        { id: 12, parentOrganizationId: 11 },
        { id: 20, parentOrganizationId: null }, // different subtree
      ]);

      const result = await service.resolveOrgAccess(ctx);

      expect(result.kind).toBe('ORG_TREE');
      if (result.kind === 'ORG_TREE') {
        expect(result.orgIds.has(10)).toBe(true);
        expect(result.orgIds.has(11)).toBe(true);
        expect(result.orgIds.has(12)).toBe(true);
        expect(result.orgIds.has(20)).toBe(false);
        expect(result.orgIds.size).toBe(3);
      }
    });

    it('merges org subtrees when user has multiple ORGANIZATION_TREE roles', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10),
        makeRole(ScopeType.ORGANIZATION_TREE, 20),
      ]);
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
        { id: 11, parentOrganizationId: 10 },
        { id: 20, parentOrganizationId: null },
        { id: 21, parentOrganizationId: 20 },
      ]);

      const result = await service.resolveOrgAccess(ctx);

      expect(result.kind).toBe('ORG_TREE');
      if (result.kind === 'ORG_TREE') {
        expect(result.orgIds.has(10)).toBe(true);
        expect(result.orgIds.has(11)).toBe(true);
        expect(result.orgIds.has(20)).toBe(true);
        expect(result.orgIds.has(21)).toBe(true);
      }
    });

    it('returns PRIMARY_ORG with orgId for EMPLOYEE with primary assignment', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([makeRole(ScopeType.SELF)]);
      prisma.userAccount.findFirst.mockResolvedValue({ employeeId: 42 });
      prisma.employment.findFirst.mockResolvedValue({ organizationId: 7 });

      const result = await service.resolveOrgAccess(ctx);

      expect(result).toEqual({ kind: 'PRIMARY_ORG', orgId: 7 });
    });

    it('returns PRIMARY_ORG with null orgId when employee has no primary assignment', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([makeRole(ScopeType.SELF)]);
      prisma.userAccount.findFirst.mockResolvedValue({ employeeId: 42 });
      prisma.employment.findFirst.mockResolvedValue(null);

      const result = await service.resolveOrgAccess(ctx);

      expect(result).toEqual({ kind: 'PRIMARY_ORG', orgId: null });
    });

    it('returns PRIMARY_ORG with null orgId when userAccount has no employeeId', async () => {
      roleAssignmentService.getActiveRoles.mockResolvedValue([]);
      prisma.userAccount.findFirst.mockResolvedValue(null);

      const result = await service.resolveOrgAccess(ctx);

      expect(result).toEqual({ kind: 'PRIMARY_ORG', orgId: null });
    });
  });

  // ── canAccessOrg ──────────────────────────────────────────

  describe('canAccessOrg', () => {
    it('returns true for TENANT_ALL regardless of orgId', () => {
      const access = { kind: 'TENANT_ALL' as const };
      expect(service.canAccessOrg(access, 1)).toBe(true);
      expect(service.canAccessOrg(access, 999)).toBe(true);
    });

    it('returns true for ORG_TREE when orgId is in set', () => {
      const access = { kind: 'ORG_TREE' as const, orgIds: new Set([1, 2, 3]) };
      expect(service.canAccessOrg(access, 1)).toBe(true);
      expect(service.canAccessOrg(access, 3)).toBe(true);
    });

    it('returns false for ORG_TREE when orgId is not in set', () => {
      const access = { kind: 'ORG_TREE' as const, orgIds: new Set([1, 2]) };
      expect(service.canAccessOrg(access, 99)).toBe(false);
    });

    it('returns true for PRIMARY_ORG (EMPLOYEE sees full org chart)', () => {
      const access = { kind: 'PRIMARY_ORG' as const, orgId: 5 };
      expect(service.canAccessOrg(access, 5)).toBe(true);
      expect(service.canAccessOrg(access, 99)).toBe(true);
    });
  });

  // ── orgInEmployeeListScope ────────────────────────────────

  describe('orgInEmployeeListScope', () => {
    it('returns true for TENANT_ALL', () => {
      expect(service.orgInEmployeeListScope({ kind: 'TENANT_ALL' }, 1)).toBe(true);
    });

    it('returns true for ORG_TREE when orgId is in set', () => {
      const access = { kind: 'ORG_TREE' as const, orgIds: new Set([10]) };
      expect(service.orgInEmployeeListScope(access, 10)).toBe(true);
    });

    it('returns false for ORG_TREE when orgId is not in set', () => {
      const access = { kind: 'ORG_TREE' as const, orgIds: new Set([10]) };
      expect(service.orgInEmployeeListScope(access, 99)).toBe(false);
    });

    it('returns true for PRIMARY_ORG when orgId matches', () => {
      const access = { kind: 'PRIMARY_ORG' as const, orgId: 5 };
      expect(service.orgInEmployeeListScope(access, 5)).toBe(true);
    });

    it('returns false for PRIMARY_ORG when orgId does not match', () => {
      const access = { kind: 'PRIMARY_ORG' as const, orgId: 5 };
      expect(service.orgInEmployeeListScope(access, 99)).toBe(false);
    });

    it('returns false for PRIMARY_ORG with null orgId', () => {
      const access = { kind: 'PRIMARY_ORG' as const, orgId: null };
      expect(service.orgInEmployeeListScope(access, 1)).toBe(false);
    });
  });
});
