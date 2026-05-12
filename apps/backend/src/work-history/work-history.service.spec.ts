import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WorkHistoryService } from './work-history.service';
import type { WorkHistoryRepository } from './work-history.repository';
import type { AuditService } from '../audit/audit.service';
import type { ScopeResolverService } from '../authorization/scope-resolver.service';

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  employeeId: 10,
  yearMonthFrom: '2024-01',
  yearMonthTo: '2024-12',
  isCurrent: false,
  workSummary: 'テスト業務',
  toolsUsed: null as string | null,
  roleName: null as string | null,
  teamSize: null as number | null,
  projectCode: null as string | null,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const ctx = { userAccountId: 99, employeeId: 10, tenantId: 1 };

describe('WorkHistoryService', () => {
  let service: WorkHistoryService;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let auditService: Record<string, ReturnType<typeof vi.fn>>;
  let scopeResolverService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    repo = {
      findByEmployee: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    auditService = {
      logEdit: vi.fn().mockResolvedValue(undefined),
    };
    scopeResolverService = {
      canAccessEmployeeWorkHistory: vi.fn(),
      canAssistEditEmployeeWorkHistory: vi.fn(),
    };
    service = new WorkHistoryService(
      repo as unknown as WorkHistoryRepository,
      auditService as unknown as AuditService,
      scopeResolverService as unknown as ScopeResolverService,
    );
  });

  // --- list ---

  describe('list', () => {
    it('閲覧許可が得られた場合は職歴一覧を返す', async () => {
      scopeResolverService.canAccessEmployeeWorkHistory.mockResolvedValue(true);
      const records = [makeRecord()];
      repo.findByEmployee.mockResolvedValue(records);

      const result = await service.list(ctx, 10);

      expect(result).toEqual(records);
      expect(repo.findByEmployee).toHaveBeenCalledWith(10, 1);
    });

    it('閲覧権限がない場合は ForbiddenException', async () => {
      scopeResolverService.canAccessEmployeeWorkHistory.mockResolvedValue(false);

      await expect(service.list(ctx, 99)).rejects.toThrow(ForbiddenException);
      expect(repo.findByEmployee).not.toHaveBeenCalled();
    });

    it('HR_ADMIN など他社員閲覧可の場合: 対象 employeeId の一覧を返す', async () => {
      scopeResolverService.canAccessEmployeeWorkHistory.mockResolvedValue(true);
      const OTHER_EMP = 20;
      const records = [makeRecord({ employeeId: OTHER_EMP })];
      repo.findByEmployee.mockResolvedValue(records);

      const result = await service.list(ctx, OTHER_EMP);

      expect(result).toEqual(records);
      expect(scopeResolverService.canAccessEmployeeWorkHistory).toHaveBeenCalledWith(ctx, OTHER_EMP);
      expect(repo.findByEmployee).toHaveBeenCalledWith(OTHER_EMP, ctx.tenantId);
    });

    it('EMPLOYEE 等閲覧権限なしの場合: ForbiddenException で repo は呼ばれない', async () => {
      scopeResolverService.canAccessEmployeeWorkHistory.mockResolvedValue(false);
      const OTHER_EMP = 99;

      await expect(service.list(ctx, OTHER_EMP)).rejects.toThrow(ForbiddenException);
      expect(scopeResolverService.canAccessEmployeeWorkHistory).toHaveBeenCalledWith(ctx, OTHER_EMP);
      expect(repo.findByEmployee).not.toHaveBeenCalled();
    });
  });

  // --- create ---

  describe('create', () => {
    it('自分の職歴を作成できる', async () => {
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      const record = makeRecord();
      repo.create.mockResolvedValue(record);
      const dto = { yearMonthFrom: '2024-01', yearMonthTo: '2024-12', isCurrent: false, workSummary: '業務内容' };
      const result = await service.create(ctx, 10, dto);
      expect(result).toEqual(record);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 10,
        tenantId: 1,
        yearMonthFrom: '2024-01',
      }));
    });

    it('HR_ADMIN など編集権限がある場合は他社員の職歴を作成できる', async () => {
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      const OTHER_EMP = 20;
      const record = makeRecord({ employeeId: OTHER_EMP });
      repo.create.mockResolvedValue(record);
      const dto = { yearMonthFrom: '2024-01', workSummary: '業務内容' };
      const result = await service.create(ctx, OTHER_EMP, dto);
      expect(result).toEqual(record);
      expect(scopeResolverService.canAssistEditEmployeeWorkHistory).toHaveBeenCalledWith(ctx, OTHER_EMP);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ employeeId: OTHER_EMP }));
    });

    it('編集権限がない場合は他社員の職歴を作成できない', async () => {
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(false);
      const dto = { yearMonthFrom: '2024-01', workSummary: '業務' };
      await expect(service.create(ctx, 99, dto)).rejects.toThrow(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('yearMonthTo が yearMonthFrom より前だと UnprocessableEntityException', async () => {
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      const dto = { yearMonthFrom: '2024-06', yearMonthTo: '2024-01', isCurrent: false, workSummary: '業務' };
      await expect(service.create(ctx, 10, dto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('isCurrent=true なら yearMonthTo の逆転チェックをスキップ', async () => {
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      const record = makeRecord({ isCurrent: true, yearMonthTo: null });
      repo.create.mockResolvedValue(record);
      const dto = { yearMonthFrom: '2024-06', isCurrent: true, workSummary: '業務' };
      await expect(service.create(ctx, 10, dto)).resolves.toEqual(record);
    });
  });

  // --- update ---

  describe('update', () => {
    it('自分の職歴を更新できる', async () => {
      const existing = makeRecord();
      const updated = makeRecord({ workSummary: '更新後' });
      repo.findById.mockResolvedValue(existing);
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      repo.update.mockResolvedValue(updated);
      const result = await service.update(ctx, 1, { workSummary: '更新後' });
      expect(result).toEqual(updated);
    });

    it('存在しない ID だと NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ctx, 999, { workSummary: '更新' })).rejects.toThrow(NotFoundException);
    });

    it('HR_ADMIN など編集権限がある場合は他社員の職歴を更新できる', async () => {
      const OTHER_EMP = 20;
      const existing = makeRecord({ employeeId: OTHER_EMP });
      const updated = makeRecord({ employeeId: OTHER_EMP, workSummary: '管理者更新' });
      repo.findById.mockResolvedValue(existing);
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      repo.update.mockResolvedValue(updated);

      const result = await service.update(ctx, 1, { workSummary: '管理者更新' });
      expect(result).toEqual(updated);
      expect(scopeResolverService.canAssistEditEmployeeWorkHistory).toHaveBeenCalledWith(ctx, OTHER_EMP);
    });

    it('編集権限がない場合は ForbiddenException', async () => {
      const existing = makeRecord({ employeeId: 999 });
      repo.findById.mockResolvedValue(existing);
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(false);
      await expect(service.update(ctx, 1, { workSummary: '更新' })).rejects.toThrow(ForbiddenException);
    });
  });

  // --- remove ---

  describe('remove', () => {
    it('自分の職歴を削除できる', async () => {
      repo.findById.mockResolvedValue(makeRecord());
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      await expect(service.remove(ctx, 1)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(1, 1);
    });

    it('存在しない ID だと NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(ctx, 999)).rejects.toThrow(NotFoundException);
    });

    it('HR_ADMIN など編集権限がある場合は他社員の職歴を削除できる', async () => {
      repo.findById.mockResolvedValue(makeRecord({ employeeId: 20 }));
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(true);
      await expect(service.remove(ctx, 1)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(1, 1);
    });

    it('編集権限がない場合は ForbiddenException', async () => {
      repo.findById.mockResolvedValue(makeRecord({ employeeId: 999 }));
      scopeResolverService.canAssistEditEmployeeWorkHistory.mockResolvedValue(false);
      await expect(service.remove(ctx, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
