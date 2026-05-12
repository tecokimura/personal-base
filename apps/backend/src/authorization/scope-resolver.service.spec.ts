import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScopeResolverService } from './scope-resolver.service';
import { ScopeType, RoleType } from './constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';

const ctx = { userAccountId: 99, employeeId: 10, tenantId: 1 };

const makeRole = (scopeType: number, scopeId: number | null = null, roleType = RoleType.HR_ADMIN) => ({
  id: 1,
  userAccountId: 99,
  tenantId: 1,
  roleType,
  scopeType,
  scopeId: scopeId ?? 0,
  effectiveFrom: new Date(),
  effectiveTo: null as Date | null,
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
      employee: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      employment: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
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

  // ── canAccessEmployeeWorkHistory ─────────────────────────

  describe('canAccessEmployeeWorkHistory', () => {
    const TARGET_EMP = 20;

    it('自分自身は常に閲覧可', async () => {
      const result = await service.canAccessEmployeeWorkHistory(ctx, ctx.employeeId);
      expect(result).toBe(true);
    });

    it('対象社員がテナントに存在しない場合は false', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      roleAssignmentService.getActiveRoles.mockResolvedValue([]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('HR_ADMIN は通常社員の WorkHistory を閲覧可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.HR_ADMIN),
      ]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('EXECUTIVE_VIEWER は通常社員の WorkHistory を閲覧可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.EXECUTIVE_VIEWER),
      ]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('MANAGER は配下組織社員の WorkHistory を閲覧可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.MANAGER),
      ]);
      // Org tree: 10 → 11
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
        { id: 11, parentOrganizationId: 10 },
      ]);
      // Target employee belongs to org 11
      prisma.employment.findMany.mockResolvedValue([{ organizationId: 11 }]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('MANAGER は配下組織外社員の WorkHistory を閲覧不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.MANAGER),
      ]);
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
      ]);
      // Target belongs to org 99 (outside tree)
      prisma.employment.findMany.mockResolvedValue([{ organizationId: 99 }]);
      // Primary org query for EMPLOYEE fallback
      prisma.employment.findFirst
        .mockResolvedValueOnce({ organizationId: 5 })  // caller
        .mockResolvedValueOnce({ organizationId: 8 }); // target (different)

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('EMPLOYEE は主所属が同じ同僚の WorkHistory を閲覧可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.SELF, null, RoleType.EMPLOYEE),
      ]);
      // Both caller and target share primary org 5
      prisma.employment.findFirst
        .mockResolvedValueOnce({ organizationId: 5 })  // caller's primary
        .mockResolvedValueOnce({ organizationId: 5 }); // target's primary

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('EMPLOYEE は主所属が異なる同僚の WorkHistory を閲覧不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.SELF, null, RoleType.EMPLOYEE),
      ]);
      prisma.employment.findFirst
        .mockResolvedValueOnce({ organizationId: 5 })
        .mockResolvedValueOnce({ organizationId: 9 });

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('ORG_ADMIN は通常社員の WorkHistory を閲覧不可（主所属が異なる場合）', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.ORG_ADMIN),
      ]);
      // ORG_ADMIN should not be treated as MANAGER for WorkHistory
      prisma.employment.findFirst
        .mockResolvedValueOnce({ organizationId: 5 })
        .mockResolvedValueOnce({ organizationId: 9 });

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('ORG_ADMIN は通常社員の WorkHistory を閲覧不可（主所属が同じでも EMPLOYEE ロールなしは不可）', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.ORG_ADMIN),
      ]);
      // primary org is same for both — must still be rejected because caller lacks EMPLOYEE role
      prisma.employment.findFirst
        .mockResolvedValueOnce({ organizationId: 5 })
        .mockResolvedValueOnce({ organizationId: 5 });

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('MANAGER は ORGANIZATION_TREE 外の社員を主所属一致でも閲覧不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.MANAGER),
      ]);
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
      ]);
      // Target belongs to org 99 (outside tree)
      prisma.employment.findMany.mockResolvedValue([{ organizationId: 99 }]);
      // primary org is same — must still be rejected because caller lacks EMPLOYEE role
      prisma.employment.findFirst
        .mockResolvedValueOnce({ organizationId: 5 })
        .mockResolvedValueOnce({ organizationId: 5 });

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('HR_ADMIN は論理削除社員の WorkHistory を閲覧可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: true });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.HR_ADMIN),
      ]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('ORG_ADMIN は論理削除社員の WorkHistory を閲覧可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: true });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.ORG_ADMIN),
      ]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('EXECUTIVE_VIEWER は論理削除社員の WorkHistory を閲覧不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: true });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.EXECUTIVE_VIEWER),
      ]);

      const result = await service.canAccessEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('テナント越境: 異テナントユーザーは閲覧不可 (employee.findFirst が null を返す)', async () => {
      // target employee not found because tenantId differs → prisma returns null
      prisma.employee.findFirst.mockResolvedValue(null);
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.HR_ADMIN),
      ]);

      const result = await service.canAccessEmployeeWorkHistory(
        { ...ctx, tenantId: 2 },
        TARGET_EMP,
      );
      expect(result).toBe(false);
    });
  });

  // ── canAssistEditEmployeeWorkHistory ─────────────────────

  describe('canAssistEditEmployeeWorkHistory', () => {
    const TARGET_EMP = 20;

    it('自分自身は常に編集可', async () => {
      const result = await service.canAssistEditEmployeeWorkHistory(ctx, ctx.employeeId);
      expect(result).toBe(true);
    });

    it('対象社員がテナントに存在しない場合は false', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      roleAssignmentService.getActiveRoles.mockResolvedValue([]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('HR_ADMIN は通常社員の WorkHistory を編集可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.HR_ADMIN),
      ]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('HR_ADMIN は論理削除社員の WorkHistory を編集可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: true });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.HR_ADMIN),
      ]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('MANAGER は配下組織社員の WorkHistory を編集可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.MANAGER),
      ]);
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
        { id: 11, parentOrganizationId: 10 },
      ]);
      prisma.employment.findMany.mockResolvedValue([{ organizationId: 11 }]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(true);
    });

    it('MANAGER は配下組織外社員の WorkHistory を編集不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.MANAGER),
      ]);
      prisma.organization.findMany.mockResolvedValue([
        { id: 10, parentOrganizationId: null },
      ]);
      prisma.employment.findMany.mockResolvedValue([{ organizationId: 99 }]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('MANAGER は論理削除社員の WorkHistory を編集不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: true });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.ORGANIZATION_TREE, 10, RoleType.MANAGER),
      ]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('EMPLOYEE は他社員の WorkHistory を編集不可', async () => {
      prisma.employee.findFirst.mockResolvedValue({ isDeleted: false });
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.SELF, null, RoleType.EMPLOYEE),
      ]);

      const result = await service.canAssistEditEmployeeWorkHistory(ctx, TARGET_EMP);
      expect(result).toBe(false);
    });

    it('テナント越境: 異テナントユーザーは編集不可', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      roleAssignmentService.getActiveRoles.mockResolvedValue([
        makeRole(ScopeType.TENANT_ALL, null, RoleType.HR_ADMIN),
      ]);

      const result = await service.canAssistEditEmployeeWorkHistory(
        { ...ctx, tenantId: 2 },
        TARGET_EMP,
      );
      expect(result).toBe(false);
    });
  });
});
