import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import type { TenantRepository } from './tenant.repository';

const makeTenant = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantCode: 'SAMPLE',
  name: 'Sample Company',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TenantService', () => {
  let service: TenantService;
  let mockFindById: ReturnType<typeof vi.fn>;
  let mockFindByCode: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFindById = vi.fn();
    mockFindByCode = vi.fn().mockResolvedValue(null);
    mockCreate = vi.fn();

    const repo = {
      findById: mockFindById,
      findByCode: mockFindByCode,
      create: mockCreate,
    } as unknown as TenantRepository;

    service = new TenantService(repo);
  });

  describe('createTenant', () => {
    it('新規 tenantCode でテナントを作成する', async () => {
      const tenant = makeTenant();
      mockCreate.mockResolvedValue(tenant);

      const result = await service.createTenant('SAMPLE', 'Sample Company');

      expect(result).toEqual(tenant);
      expect(mockCreate).toHaveBeenCalledWith({ tenantCode: 'SAMPLE', name: 'Sample Company' });
    });

    it('重複 tenantCode で ConflictException をスローする', async () => {
      mockFindByCode.mockResolvedValue(makeTenant());

      await expect(service.createTenant('SAMPLE', 'Another')).rejects.toThrow(ConflictException);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('assertExists', () => {
    it('存在する tenantId で Tenant を返す', async () => {
      const tenant = makeTenant();
      mockFindById.mockResolvedValue(tenant);

      const result = await service.assertExists(1);

      expect(result).toEqual(tenant);
    });

    it('存在しない tenantId で NotFoundException をスローする', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.assertExists(99)).rejects.toThrow(NotFoundException);
    });
  });
});
