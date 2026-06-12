import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PositionMasterService } from './position-master.service';
import type { PositionMasterRepository } from './position-master.repository';
import type { AuthorizationService } from '../authorization/authorization.service';

const makePosition = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  name: '部長',
  displayOrder: 0,
  isActive: true,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const ctx = { userAccountId: 99, employeeId: 99, tenantId: 1 };

describe('PositionMasterService', () => {
  let service: PositionMasterService;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let authzService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    repo = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    };

    authzService = {
      assertCan: vi.fn().mockResolvedValue(undefined),
    };

    service = new PositionMasterService(
      repo as unknown as PositionMasterRepository,
      authzService as unknown as AuthorizationService,
    );
  });

  describe('findAll', () => {
    it('active な役職一覧を返す', async () => {
      repo.findAll.mockResolvedValue([makePosition()]);
      const result = await service.findAll(ctx);
      expect(result).toHaveLength(1);
      expect(repo.findAll).toHaveBeenCalledWith(1);
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());
      await expect(service.findAll(ctx)).rejects.toThrow(ForbiddenException);
      expect(repo.findAll).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('役職を登録できる', async () => {
      repo.create.mockResolvedValue(makePosition({ name: '課長' }));
      const result = await service.create(ctx, { name: '課長' });
      expect(result.name).toBe('課長');
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it('displayOrder を省略すると 0 になる', async () => {
      repo.create.mockResolvedValue(makePosition());
      await service.create(ctx, { name: '部長' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ displayOrder: 0 }),
      );
    });

    it('displayOrder を指定すると反映される', async () => {
      repo.create.mockResolvedValue(makePosition({ displayOrder: 5 }));
      await service.create(ctx, { name: '部長', displayOrder: 5 });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ displayOrder: 5 }),
      );
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());
      await expect(service.create(ctx, { name: '部長' })).rejects.toThrow(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('役職を更新できる', async () => {
      repo.findById.mockResolvedValue(makePosition());
      repo.update.mockResolvedValue(makePosition({ name: '新部長' }));
      const result = await service.update(ctx, 1, { name: '新部長' });
      expect(result.name).toBe('新部長');
      expect(repo.update).toHaveBeenCalledOnce();
    });

    it('存在しない役職は NotFoundException をスローする', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ctx, 999, { name: '部長' })).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());
      await expect(service.update(ctx, 1, { name: '部長' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivate', () => {
    it('役職を無効化できる', async () => {
      repo.findById.mockResolvedValue(makePosition());
      await service.deactivate(ctx, 1);
      expect(repo.deactivate).toHaveBeenCalledWith(1, 1, 99);
    });

    it('存在しない役職は NotFoundException をスローする', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.deactivate(ctx, 999)).rejects.toThrow(NotFoundException);
      expect(repo.deactivate).not.toHaveBeenCalled();
    });

    it('権限がない場合 ForbiddenException をスローする', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());
      await expect(service.deactivate(ctx, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
