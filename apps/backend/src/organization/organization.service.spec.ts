import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import type { OrganizationRepository } from './organization.repository';
import type { OrganizationLeaderRepository } from './organization-leader.repository';
import type { AuthorizationService } from '../authorization/authorization.service';

const makeOrg = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  organizationName: '開発部',
  organizationCode: null as string | null,
  parentOrganizationId: null as number | null,
  displayOrder: 0,
  isActive: true,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeLeader = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  organizationId: 1,
  employeeId: 10,
  leaderType: 1,
  isPrimaryLeader: true,
  startDate: new Date('2026-01-01'),
  endDate: null as Date | null,
  status: 1,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const ctx = { userAccountId: 99, tenantId: 1 };

describe('OrganizationService', () => {
  let service: OrganizationService;
  let orgRepo: Record<string, ReturnType<typeof vi.fn>>;
  let leaderRepo: Record<string, ReturnType<typeof vi.fn>>;
  let authzService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    orgRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      hasActiveChildren: vi.fn().mockResolvedValue(false),
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
      findAncestorIds: vi.fn().mockResolvedValue(new Set<number>()),
      employeeExistsInTenant: vi.fn().mockResolvedValue(true),
    };

    leaderRepo = {
      findById: vi.fn(),
      findByOrganizationId: vi.fn(),
      hasActiveLeaders: vi.fn().mockResolvedValue(false),
      hasActivePrimaryLeader: vi.fn().mockResolvedValue(false),
      hasActiveLeaderByType: vi.fn().mockResolvedValue(false),
      create: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    };

    authzService = {
      assertCan: vi.fn().mockResolvedValue(undefined),
    };

    service = new OrganizationService(
      orgRepo as unknown as OrganizationRepository,
      leaderRepo as unknown as OrganizationLeaderRepository,
      authzService as unknown as AuthorizationService,
    );
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('is_active=true の組織一覧を返す', async () => {
      const orgs = [makeOrg(), makeOrg({ id: 2, organizationName: '営業部' })];
      orgRepo.findAll.mockResolvedValue(orgs);

      const result = await service.findAll(1);

      expect(result).toHaveLength(2);
      expect(orgRepo.findAll).toHaveBeenCalledWith(1, true);
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('存在する組織を返す', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());

      const result = await service.findById(1, 1);

      expect(result.id).toBe(1);
    });

    it('存在しない場合 NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('他テナントの組織は NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(null); // repo はテナント込みで検索する

      await expect(service.findById(1, 2)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTree ──────────────────────────────────────────────────────────────

  describe('getTree', () => {
    it('空のツリーを返す', async () => {
      orgRepo.findAll.mockResolvedValue([]);

      const result = await service.getTree(1);

      expect(result).toEqual([]);
    });

    it('親子関係を正しくツリー構造に変換する', async () => {
      const parent = makeOrg({ id: 1, parentOrganizationId: null });
      const child = makeOrg({ id: 2, organizationName: '開発課', parentOrganizationId: 1 });
      orgRepo.findAll.mockResolvedValue([parent, child]);

      const result = await service.getTree(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe(2);
    });

    it('複数のルート組織を返す', async () => {
      orgRepo.findAll.mockResolvedValue([
        makeOrg({ id: 1 }),
        makeOrg({ id: 2, organizationName: '営業部' }),
      ]);

      const result = await service.getTree(1);

      expect(result).toHaveLength(2);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('組織を登録できる', async () => {
      const org = makeOrg();
      orgRepo.create.mockResolvedValue(org);

      const result = await service.create(ctx, { organizationName: '開発部' });

      expect(result.id).toBe(1);
      expect(authzService.assertCan).toHaveBeenCalledOnce();
      expect(orgRepo.create).toHaveBeenCalledOnce();
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create(ctx, { organizationName: '開発部' }),
      ).rejects.toThrow(ForbiddenException);

      expect(orgRepo.create).not.toHaveBeenCalled();
    });

    it('存在しない親組織を指定すると NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(ctx, { organizationName: '開発部', parentOrganizationId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('組織を更新できる', async () => {
      const updated = makeOrg({ organizationName: '新開発部' });
      orgRepo.findById.mockResolvedValue(makeOrg());
      orgRepo.update.mockResolvedValue(updated);

      const result = await service.update(ctx, 1, { organizationName: '新開発部' });

      expect(result.organizationName).toBe('新開発部');
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(service.update(ctx, 1, { organizationName: '新開発部' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('自分自身を親に指定すると UnprocessableEntityException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());

      await expect(
        service.update(ctx, 1, { parentOrganizationId: 1 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('子孫を親に指定すると UnprocessableEntityException をスローする', async () => {
      // org 1 の祖先チェーンに org 1 が含まれる = 循環
      const child = makeOrg({ id: 2, parentOrganizationId: 1 });
      orgRepo.findById
        .mockResolvedValueOnce(makeOrg()) // assertOrgExists(1)
        .mockResolvedValueOnce(child);    // assertOrgExists(2)
      orgRepo.findAncestorIds.mockResolvedValue(new Set([2, 1])); // 2 の祖先に 1 が含まれる

      await expect(
        service.update(ctx, 1, { parentOrganizationId: 2 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── deactivate ───────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('前提条件を満たせば無効化できる', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());

      await service.deactivate(ctx, 1);

      expect(orgRepo.deactivate).toHaveBeenCalledOnce();
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(service.deactivate(ctx, 1)).rejects.toThrow(ForbiddenException);
    });

    it('有効な子組織がある場合 ConflictException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      orgRepo.hasActiveChildren.mockResolvedValue(true);

      await expect(service.deactivate(ctx, 1)).rejects.toThrow(ConflictException);

      expect(orgRepo.deactivate).not.toHaveBeenCalled();
    });

    it('有効な部門長がある場合 ConflictException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.hasActiveLeaders.mockResolvedValue(true);

      await expect(service.deactivate(ctx, 1)).rejects.toThrow(ConflictException);

      expect(orgRepo.deactivate).not.toHaveBeenCalled();
    });
  });

  // ─── getLeaders ───────────────────────────────────────────────────────────

  describe('getLeaders', () => {
    it('組織の部門長一覧を返す', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.findByOrganizationId.mockResolvedValue([makeLeader()]);

      const result = await service.getLeaders(1, 1);

      expect(result).toHaveLength(1);
    });

    it('組織が存在しない場合 NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(null);

      await expect(service.getLeaders(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── addLeader ────────────────────────────────────────────────────────────

  describe('addLeader', () => {
    it('部門長を追加できる', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.create.mockResolvedValue(makeLeader());

      const result = await service.addLeader(ctx, 1, {
        employeeId: 10,
        leaderType: 1,
        startDate: new Date('2026-04-01'),
      });

      expect(result.employeeId).toBe(10);
      expect(leaderRepo.create).toHaveBeenCalledOnce();
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(
        service.addLeader(ctx, 1, { employeeId: 10, leaderType: 1, startDate: new Date() }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('同一 leaderType の有効部門長がいると ConflictException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.hasActiveLeaderByType.mockResolvedValue(true);

      await expect(
        service.addLeader(ctx, 1, { employeeId: 10, leaderType: 1, startDate: new Date() }),
      ).rejects.toThrow(ConflictException);

      expect(leaderRepo.create).not.toHaveBeenCalled();
    });

    it('leaderType が異なれば別々に追加できる', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.hasActiveLeaderByType.mockResolvedValue(false);
      leaderRepo.create.mockResolvedValue(makeLeader({ leaderType: 2 }));

      await service.addLeader(ctx, 1, { employeeId: 10, leaderType: 2, startDate: new Date() });

      expect(leaderRepo.create).toHaveBeenCalledOnce();
    });

    it('存在しない社員を指定すると NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      orgRepo.employeeExistsInTenant.mockResolvedValue(false);

      await expect(
        service.addLeader(ctx, 1, { employeeId: 999, leaderType: 1, startDate: new Date() }),
      ).rejects.toThrow(NotFoundException);

      expect(leaderRepo.create).not.toHaveBeenCalled();
    });

    it('isPrimaryLeader=true のとき既存の主部門長がいると ConflictException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.hasActivePrimaryLeader.mockResolvedValue(true);

      await expect(
        service.addLeader(ctx, 1, {
          employeeId: 10,
          leaderType: 1,
          isPrimaryLeader: true,
          startDate: new Date(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('isPrimaryLeader=false のとき主部門長チェックをスキップする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.create.mockResolvedValue(makeLeader({ isPrimaryLeader: false }));

      await service.addLeader(ctx, 1, {
        employeeId: 10,
        leaderType: 2,
        isPrimaryLeader: false,
        startDate: new Date(),
      });

      expect(leaderRepo.hasActivePrimaryLeader).not.toHaveBeenCalled();
      expect(leaderRepo.create).toHaveBeenCalledOnce();
    });
  });

  // ─── terminateLeader ──────────────────────────────────────────────────────

  describe('terminateLeader', () => {
    it('部門長を終了できる', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.findById.mockResolvedValue(makeLeader());

      await service.terminateLeader(ctx, 1, 1, new Date('2026-04-30'));

      expect(leaderRepo.terminate).toHaveBeenCalledOnce();
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(
        service.terminateLeader(ctx, 1, 1, new Date()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('別の組織の部門長を指定すると NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      // organizationId が異なるリーダー
      leaderRepo.findById.mockResolvedValue(makeLeader({ organizationId: 99 }));

      await expect(service.terminateLeader(ctx, 1, 1, new Date())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('他テナントの部門長は NotFoundException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.findById.mockResolvedValue(null); // テナント不一致で repo が null を返す

      await expect(service.terminateLeader(ctx, 1, 1, new Date())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('すでに終了済みの部門長は ConflictException をスローする', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.findById.mockResolvedValue(makeLeader({ status: 2 }));

      await expect(service.terminateLeader(ctx, 1, 1, new Date())).rejects.toThrow(
        ConflictException,
      );
    });

    it('endDate が startDate より前の場合 UnprocessableEntityException をスローする', async () => {
      const startDate = new Date('2026-04-01');
      orgRepo.findById.mockResolvedValue(makeOrg());
      leaderRepo.findById.mockResolvedValue(makeLeader({ startDate }));
      const endDateBeforeStart = new Date('2026-03-31');

      await expect(
        service.terminateLeader(ctx, 1, 1, endDateBeforeStart),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(leaderRepo.terminate).not.toHaveBeenCalled();
    });
  });
});
