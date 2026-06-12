import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';
import type { OrgChartRepository, OrgRow, LeaderRow, EmploymentRow } from './org-chart.repository';
import type { ScopeResolverService } from '../authorization/scope-resolver.service';

const makeOrg = (overrides: Partial<OrgRow> = {}): OrgRow => ({
  id: 1,
  tenantId: 1,
  organizationName: '開発部',
  organizationCode: 'DEV',
  parentOrganizationId: null,
  displayOrder: 0,
  ...overrides,
});

const makeLeader = (overrides: Partial<LeaderRow> = {}): LeaderRow => ({
  id: 1,
  organizationId: 1,
  employeeId: 10,
  leaderType: 1,
  displayName: '部長 太郎',
  fullName: '部長 太郎',
  ...overrides,
});

const makeEmployment = (overrides: Partial<EmploymentRow> = {}): EmploymentRow => ({
  id: 100,
  organizationId: 1,
  employeeId: 20,
  supervisorEmployeeId: null,
  positionMasterId: null,
  employeeNumber: 'EMP001',
  displayName: '山田 花子',
  fullName: '山田 花子',
  photoStorageKey: null,
  ...overrides,
});

const ctx = { userAccountId: 99, employeeId: 99, tenantId: 1 };

describe('OrgChartService', () => {
  let service: OrgChartService;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let scopeResolver: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    repo = {
      findActiveOrganizations: vi.fn().mockResolvedValue([]),
      findActiveLeaders: vi.fn().mockResolvedValue([]),
      findActiveLeadersByOrg: vi.fn().mockResolvedValue([]),
      countActiveEmploymentsByOrg: vi.fn().mockResolvedValue(new Map()),
      findActiveEmploymentsByOrg: vi.fn().mockResolvedValue([]),
      findEmployeeDisplayNameById: vi.fn().mockResolvedValue(null),
      findPrimaryOrgNameForEmployee: vi.fn().mockResolvedValue(null),
      findPositionMastersByTenant: vi.fn().mockResolvedValue(new Map()),
    };

    scopeResolver = {
      resolveOrgAccess: vi.fn().mockResolvedValue({ kind: 'TENANT_ALL' }),
      canAccessOrg: vi.fn().mockReturnValue(true),
    };

    service = new OrgChartService(
      repo as unknown as OrgChartRepository,
      scopeResolver as unknown as ScopeResolverService,
    );
  });

  // ── getTree ──────────────────────────────────────────────

  describe('getTree', () => {
    it('returns empty array when no organizations', async () => {
      const result = await service.getTree(ctx);
      expect(result).toEqual([]);
    });

    it('returns root org with childrenCount and memberCount', async () => {
      const org = makeOrg();
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.countActiveEmploymentsByOrg.mockResolvedValue(new Map([[1, 3]]));

      const result = await service.getTree(ctx);

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(1);
      expect(result[0].memberCount).toBe(3);
      expect(result[0].childrenCount).toBe(0);
      expect(result[0].children).toEqual([]);
    });

    it('builds parent-child tree correctly', async () => {
      const root = makeOrg({ id: 1, parentOrganizationId: null });
      const child = makeOrg({ id: 2, organizationName: '開発1課', parentOrganizationId: 1 });
      repo.findActiveOrganizations.mockResolvedValue([root, child]);

      const result = await service.getTree(ctx);

      expect(result).toHaveLength(1);
      expect(result[0].childrenCount).toBe(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].organizationId).toBe(2);
    });

    it('treats orphaned org (inactive parent) as root', async () => {
      // child whose parent is not in the active list (filtered out)
      const child = makeOrg({ id: 2, parentOrganizationId: 999 });
      repo.findActiveOrganizations.mockResolvedValue([child]);

      const result = await service.getTree(ctx);

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(2);
    });

    it('sets primaryLeader from leaderType=1', async () => {
      const org = makeOrg();
      const leader = makeLeader({ leaderType: 1, displayName: '部長 太郎' });
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeaders.mockResolvedValue([leader]);

      const result = await service.getTree(ctx);

      expect(result[0].primaryLeader).not.toBeNull();
      expect(result[0].primaryLeader!.displayName).toBe('部長 太郎');
      expect(result[0].primaryLeader!.leaderType).toBe(1);
    });

    it('sets primaryLeader to null when no active leaders', async () => {
      repo.findActiveOrganizations.mockResolvedValue([makeOrg()]);

      const result = await service.getTree(ctx);

      expect(result[0].primaryLeader).toBeNull();
    });

    it('falls back to fullName when displayName is null', async () => {
      const org = makeOrg();
      const leader = makeLeader({ displayName: null, fullName: '部長 太郎フルネーム' });
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeaders.mockResolvedValue([leader]);

      const result = await service.getTree(ctx);

      expect(result[0].primaryLeader!.displayName).toBe('部長 太郎フルネーム');
    });

    it('returns multiple root organizations', async () => {
      const org1 = makeOrg({ id: 1, organizationName: '開発部' });
      const org2 = makeOrg({ id: 2, organizationName: '営業部' });
      repo.findActiveOrganizations.mockResolvedValue([org1, org2]);

      const result = await service.getTree(ctx);

      expect(result).toHaveLength(2);
    });

    it('filters orgs by ORG_TREE scope', async () => {
      const org1 = makeOrg({ id: 1, organizationName: '開発部' });
      const org2 = makeOrg({ id: 2, organizationName: '営業部' });
      repo.findActiveOrganizations.mockResolvedValue([org1, org2]);
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([1]) });

      const result = await service.getTree(ctx);

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(1);
    });
  });

  // ── getOrganizationDetail ─────────────────────────────────

  describe('getOrganizationDetail', () => {
    it('returns organization detail with leaders and members', async () => {
      const org = makeOrg({ id: 1 });
      const child = makeOrg({ id: 2, organizationName: '開発1課', parentOrganizationId: 1 });
      const leader = makeLeader();
      const employment = makeEmployment();

      repo.findActiveOrganizations.mockResolvedValue([org, child]);
      repo.findActiveLeadersByOrg.mockResolvedValue([leader]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([employment]);

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.organizationId).toBe(1);
      expect(result.leaders).toHaveLength(1);
      expect(result.primaryMembers).toHaveLength(1);
      expect(result.concurrentMembers).toHaveLength(0);
      expect(result.directChildren).toHaveLength(1);
      expect(result.directChildren[0].organizationId).toBe(2);
    });

    it('throws NotFoundException when organization not found', async () => {
      repo.findActiveOrganizations.mockResolvedValue([]);

      await expect(service.getOrganizationDetail(99, ctx)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when outside scope', async () => {
      repo.findActiveOrganizations.mockResolvedValue([makeOrg({ id: 1 })]);
      scopeResolver.canAccessOrg.mockReturnValue(false);

      await expect(service.getOrganizationDetail(1, ctx)).rejects.toThrow(NotFoundException);
    });

    it('all members are in primaryMembers, concurrentMembers is empty', async () => {
      const org = makeOrg();
      const e1 = makeEmployment({ id: 100, employeeId: 20 });
      const e2 = makeEmployment({ id: 101, employeeId: 21 });

      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([e1, e2]);

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers).toHaveLength(2);
      expect(result.primaryMembers[0].assignmentLabel).toBe('主所属');
      expect(result.concurrentMembers).toHaveLength(0);
    });

    it('includes supervisor display name in employee card', async () => {
      const org = makeOrg();
      const employment = makeEmployment({ supervisorEmployeeId: 99 });
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([employment]);
      repo.findEmployeeDisplayNameById.mockResolvedValue('上長 次郎');

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers[0].supervisorDisplayName).toBe('上長 次郎');
      expect(repo.findEmployeeDisplayNameById).toHaveBeenCalledWith(99, 1);
    });

    it('sets positionName to null when positionMasterId is null', async () => {
      const org = makeOrg();
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([makeEmployment({ positionMasterId: null })]);

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers[0].positionName).toBeNull();
    });

    it('resolves positionName from PositionMaster', async () => {
      const org = makeOrg();
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([makeEmployment({ positionMasterId: 3 })]);
      repo.findPositionMastersByTenant.mockResolvedValue(new Map([[3, '部長']]));

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers[0].positionName).toBe('部長');
    });

    it('primaryOrganizationName is always null', async () => {
      const org = makeOrg();
      const employment = makeEmployment({ employeeId: 30 });
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([employment]);

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers[0].primaryOrganizationName).toBeNull();
    });

    it('masks employeeNumber to null for PRIMARY_ORG scope', async () => {
      const org = makeOrg();
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([makeEmployment({ employeeNumber: 'EMP001' })]);
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 1 });

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers[0].employeeNumber).toBeNull();
    });

    it('includes employeeNumber for TENANT_ALL scope', async () => {
      const org = makeOrg();
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveLeadersByOrg.mockResolvedValue([]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([makeEmployment({ employeeNumber: 'EMP001' })]);

      const result = await service.getOrganizationDetail(1, ctx);

      expect(result.primaryMembers[0].employeeNumber).toBe('EMP001');
    });
  });

  // ── getMembers ────────────────────────────────────────────

  describe('getMembers', () => {
    it('returns members for a valid organization', async () => {
      const org = makeOrg();
      const employment = makeEmployment();
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([employment]);

      const result = await service.getMembers(1, ctx);

      expect(result.primaryMembers).toHaveLength(1);
      expect(result.concurrentMembers).toHaveLength(0);
    });

    it('throws NotFoundException when organization not found', async () => {
      repo.findActiveOrganizations.mockResolvedValue([]);

      await expect(service.getMembers(99, ctx)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when outside scope', async () => {
      repo.findActiveOrganizations.mockResolvedValue([makeOrg({ id: 1 })]);
      scopeResolver.canAccessOrg.mockReturnValue(false);

      await expect(service.getMembers(1, ctx)).rejects.toThrow(NotFoundException);
    });

    it('sorts members by displayName', async () => {
      const org = makeOrg();
      const e1 = makeEmployment({ id: 1, employeeId: 1, displayName: '鈴木 一郎' });
      const e2 = makeEmployment({ id: 2, employeeId: 2, displayName: '阿部 花子' });
      repo.findActiveOrganizations.mockResolvedValue([org]);
      repo.findActiveEmploymentsByOrg.mockResolvedValue([e1, e2]);

      const result = await service.getMembers(1, ctx);

      expect(result.primaryMembers[0].displayName).toBe('阿部 花子');
      expect(result.primaryMembers[1].displayName).toBe('鈴木 一郎');
    });
  });

  // ── tenant isolation ──────────────────────────────────────

  describe('tenant isolation', () => {
    it('getTree calls repository with correct tenantId', async () => {
      await service.getTree({ userAccountId: 99, employeeId: 99, tenantId: 42 });
      expect(repo.findActiveOrganizations).toHaveBeenCalledWith(42);
      expect(repo.findActiveLeaders).toHaveBeenCalledWith(42);
    });

    it('getOrganizationDetail returns NotFoundException for org from different tenant', async () => {
      // Even if org 1 exists in tenant 2, tenant 1 sees nothing
      repo.findActiveOrganizations.mockResolvedValue([]);

      await expect(service.getOrganizationDetail(1, ctx)).rejects.toThrow(NotFoundException);
    });
  });
});
