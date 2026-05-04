import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WorkHistoryService } from './work-history.service';
import type { WorkHistoryRepository } from './work-history.repository';
import type { AuditService } from '../audit/audit.service';

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
    service = new WorkHistoryService(
      repo as unknown as WorkHistoryRepository,
      auditService as unknown as AuditService,
    );
  });

  // --- list ---

  describe('list', () => {
    it('自分の職歴一覧を返す', async () => {
      const records = [makeRecord()];
      repo.findByEmployee.mockResolvedValue(records);
      const result = await service.list(ctx, 10);
      expect(result).toEqual(records);
      expect(repo.findByEmployee).toHaveBeenCalledWith(10, 1);
    });

    it('他人の職歴を取得しようとすると ForbiddenException', async () => {
      await expect(service.list(ctx, 99)).rejects.toThrow(ForbiddenException);
    });
  });

  // --- create ---

  describe('create', () => {
    it('自分の職歴を作成できる', async () => {
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

    it('他人の employeeId で作成しようとすると ForbiddenException', async () => {
      const dto = { yearMonthFrom: '2024-01', workSummary: '業務' };
      await expect(service.create(ctx, 99, dto)).rejects.toThrow(ForbiddenException);
    });

    it('yearMonthTo が yearMonthFrom より前だと UnprocessableEntityException', async () => {
      const dto = { yearMonthFrom: '2024-06', yearMonthTo: '2024-01', isCurrent: false, workSummary: '業務' };
      await expect(service.create(ctx, 10, dto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('isCurrent=true なら yearMonthTo の逆転チェックをスキップ', async () => {
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
      repo.update.mockResolvedValue(updated);
      const result = await service.update(ctx, 1, { workSummary: '更新後' });
      expect(result).toEqual(updated);
    });

    it('存在しない ID だと NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ctx, 999, { workSummary: '更新' })).rejects.toThrow(NotFoundException);
    });

    it('他人の職歴を更新しようとすると ForbiddenException', async () => {
      const existing = makeRecord({ employeeId: 999 });
      repo.findById.mockResolvedValue(existing);
      await expect(service.update(ctx, 1, { workSummary: '更新' })).rejects.toThrow(ForbiddenException);
    });
  });

  // --- remove ---

  describe('remove', () => {
    it('自分の職歴を削除できる', async () => {
      repo.findById.mockResolvedValue(makeRecord());
      await expect(service.remove(ctx, 1)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(1, 1);
    });

    it('存在しない ID だと NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(ctx, 999)).rejects.toThrow(NotFoundException);
    });

    it('他人の職歴を削除しようとすると ForbiddenException', async () => {
      repo.findById.mockResolvedValue(makeRecord({ employeeId: 999 }));
      await expect(service.remove(ctx, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
