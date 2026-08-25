import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QualificationService } from './qualification.service';
import type { QualificationRepository } from './qualification.repository';
import type { AuditService } from '../audit/audit.service';
import type { ScopeResolverService } from '../authorization/scope-resolver.service';

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  employeeId: 10,
  name: '基本情報技術者試験',
  acquiredDate: new Date('2024-04-01'),
  note: null as string | null,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const ctx = { userAccountId: 99, employeeId: 10, tenantId: 1 };

describe('QualificationService', () => {
  let service: QualificationService;
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
      canAccessQualification: vi.fn(),
      canEditQualification: vi.fn(),
    };
    service = new QualificationService(
      repo as unknown as QualificationRepository,
      auditService as unknown as AuditService,
      scopeResolverService as unknown as ScopeResolverService,
    );
  });

  // --- list ---

  describe('list', () => {
    it('閲覧許可が得られた場合は資格一覧を返す', async () => {
      scopeResolverService.canAccessQualification.mockResolvedValue(true);
      const records = [makeRecord()];
      repo.findByEmployee.mockResolvedValue(records);

      const result = await service.list(ctx, 10);

      expect(result).toEqual(records);
      expect(repo.findByEmployee).toHaveBeenCalledWith(10, 1);
    });

    it('閲覧権限がない場合は ForbiddenException', async () => {
      scopeResolverService.canAccessQualification.mockResolvedValue(false);

      await expect(service.list(ctx, 99)).rejects.toThrow(ForbiddenException);
      expect(repo.findByEmployee).not.toHaveBeenCalled();
    });

    it('HR_ADMIN など他社員閲覧可の場合: 対象 employeeId の一覧を返す', async () => {
      scopeResolverService.canAccessQualification.mockResolvedValue(true);
      const OTHER_EMP = 20;
      const records = [makeRecord({ employeeId: OTHER_EMP })];
      repo.findByEmployee.mockResolvedValue(records);

      const result = await service.list(ctx, OTHER_EMP);

      expect(result).toEqual(records);
      expect(scopeResolverService.canAccessQualification).toHaveBeenCalledWith(ctx, OTHER_EMP);
      expect(repo.findByEmployee).toHaveBeenCalledWith(OTHER_EMP, ctx.tenantId);
    });

    it('EMPLOYEE 等閲覧権限なしの場合: ForbiddenException で repo は呼ばれない', async () => {
      scopeResolverService.canAccessQualification.mockResolvedValue(false);
      const OTHER_EMP = 99;

      await expect(service.list(ctx, OTHER_EMP)).rejects.toThrow(ForbiddenException);
      expect(scopeResolverService.canAccessQualification).toHaveBeenCalledWith(ctx, OTHER_EMP);
      expect(repo.findByEmployee).not.toHaveBeenCalled();
    });
  });

  // --- create ---

  describe('create', () => {
    const dto = { name: '応用情報技術者試験', acquiredDate: '2024-10-01' };

    it('自分の資格を作成できる', async () => {
      scopeResolverService.canEditQualification.mockResolvedValue(true);
      const record = makeRecord({ name: dto.name });
      repo.create.mockResolvedValue(record);

      const result = await service.create(ctx, 10, dto);

      expect(result).toEqual(record);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 10,
        tenantId: 1,
        name: dto.name,
        acquiredDate: new Date(dto.acquiredDate),
      }));
    });

    it('HR_ADMIN など編集権限がある場合は他社員の資格を作成できる', async () => {
      scopeResolverService.canEditQualification.mockResolvedValue(true);
      const OTHER_EMP = 20;
      const record = makeRecord({ employeeId: OTHER_EMP });
      repo.create.mockResolvedValue(record);

      const result = await service.create(ctx, OTHER_EMP, dto);

      expect(result).toEqual(record);
      expect(scopeResolverService.canEditQualification).toHaveBeenCalledWith(ctx, OTHER_EMP);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ employeeId: OTHER_EMP }));
    });

    it('編集権限がない場合は ForbiddenException', async () => {
      scopeResolverService.canEditQualification.mockResolvedValue(false);

      await expect(service.create(ctx, 99, dto)).rejects.toThrow(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('note を含めて作成できる', async () => {
      scopeResolverService.canEditQualification.mockResolvedValue(true);
      const dtoWithNote = { ...dto, note: 'スコア800点' };
      const record = makeRecord({ note: 'スコア800点' });
      repo.create.mockResolvedValue(record);

      const result = await service.create(ctx, 10, dtoWithNote);

      expect(result).toEqual(record);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ note: 'スコア800点' }));
    });
  });

  // --- update ---

  describe('update', () => {
    it('自分の資格を更新できる', async () => {
      const existing = makeRecord();
      const updated = makeRecord({ name: '更新後資格' });
      repo.findById.mockResolvedValue(existing);
      scopeResolverService.canEditQualification.mockResolvedValue(true);
      repo.update.mockResolvedValue(updated);

      const result = await service.update(ctx, 1, { name: '更新後資格' });

      expect(result).toEqual(updated);
    });

    it('存在しない ID だと NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update(ctx, 999, { name: '更新' })).rejects.toThrow(NotFoundException);
      expect(scopeResolverService.canEditQualification).not.toHaveBeenCalled();
    });

    it('HR_ADMIN など編集権限がある場合は他社員の資格を更新できる', async () => {
      const OTHER_EMP = 20;
      const existing = makeRecord({ employeeId: OTHER_EMP });
      const updated = makeRecord({ employeeId: OTHER_EMP, name: '管理者更新' });
      repo.findById.mockResolvedValue(existing);
      scopeResolverService.canEditQualification.mockResolvedValue(true);
      repo.update.mockResolvedValue(updated);

      const result = await service.update(ctx, 1, { name: '管理者更新' });

      expect(result).toEqual(updated);
      expect(scopeResolverService.canEditQualification).toHaveBeenCalledWith(ctx, OTHER_EMP);
    });

    it('編集権限がない場合は ForbiddenException', async () => {
      const existing = makeRecord({ employeeId: 999 });
      repo.findById.mockResolvedValue(existing);
      scopeResolverService.canEditQualification.mockResolvedValue(false);

      await expect(service.update(ctx, 1, { name: '更新' })).rejects.toThrow(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  // --- remove ---

  describe('remove', () => {
    it('自分の資格を削除できる', async () => {
      repo.findById.mockResolvedValue(makeRecord());
      scopeResolverService.canEditQualification.mockResolvedValue(true);

      await expect(service.remove(ctx, 1)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(1, 1);
    });

    it('存在しない ID だと NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove(ctx, 999)).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('HR_ADMIN など編集権限がある場合は他社員の資格を削除できる', async () => {
      repo.findById.mockResolvedValue(makeRecord({ employeeId: 20 }));
      scopeResolverService.canEditQualification.mockResolvedValue(true);

      await expect(service.remove(ctx, 1)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(1, 1);
    });

    it('編集権限がない場合は ForbiddenException', async () => {
      repo.findById.mockResolvedValue(makeRecord({ employeeId: 999 }));
      scopeResolverService.canEditQualification.mockResolvedValue(false);

      await expect(service.remove(ctx, 1)).rejects.toThrow(ForbiddenException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
