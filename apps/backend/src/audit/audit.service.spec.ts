import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';
import type { AuditRepository } from './audit.repository';

const makeLoginHistory = (overrides = {}) => ({
  id: 1,
  tenantId: 1,
  userAccountId: 1,
  employeeId: 1,
  loggedInAt: new Date(),
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  ...overrides,
});

const makeEditHistory = (overrides = {}) => ({
  id: 1,
  tenantId: 1,
  entityType: 'Employee',
  entityId: 1,
  actionType: 'CREATE',
  changedByEmployeeId: 1,
  changedAt: new Date(),
  scopeSummary: null,
  ...overrides,
});

describe('AuditService', () => {
  let service: AuditService;
  let mockCreateLogin: ReturnType<typeof vi.fn>;
  let mockCreateEdit: ReturnType<typeof vi.fn>;
  let mockFindLogin: ReturnType<typeof vi.fn>;
  let mockFindEdit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateLogin = vi.fn().mockResolvedValue(undefined);
    mockCreateEdit = vi.fn().mockResolvedValue(undefined);
    mockFindLogin = vi.fn();
    mockFindEdit = vi.fn();

    const repo = {
      createLoginHistory: mockCreateLogin,
      createEditHistory: mockCreateEdit,
      findLoginHistoryByTenant: mockFindLogin,
      findEditHistoryByTenant: mockFindEdit,
    } as unknown as AuditRepository;

    service = new AuditService(repo);
  });

  describe('logLogin', () => {
    it('ログイン履歴を記録する', async () => {
      const data = { tenantId: 1, userAccountId: 1, employeeId: 1, ipAddress: '127.0.0.1', userAgent: 'ua' };
      await service.logLogin(data);
      expect(mockCreateLogin).toHaveBeenCalledWith(data);
    });

    it('記録失敗時もエラーを外に投げない', async () => {
      mockCreateLogin.mockRejectedValue(new Error('DB error'));
      const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      await expect(service.logLogin({ tenantId: 1, userAccountId: 1, employeeId: 1 })).resolves.not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('logEdit', () => {
    it('編集履歴を記録する', async () => {
      const data = {
        tenantId: 1,
        entityType: 'Employee',
        entityId: 5,
        actionType: 'UPDATE',
        changedByEmployeeId: 1,
      };
      await service.logEdit(data);
      expect(mockCreateEdit).toHaveBeenCalledWith(data);
    });

    it('記録失敗時もエラーを外に投げない', async () => {
      mockCreateEdit.mockRejectedValue(new Error('DB error'));
      const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      await expect(
        service.logEdit({ tenantId: 1, entityType: 'Employee', entityId: 1, actionType: 'CREATE', changedByEmployeeId: 1 }),
      ).resolves.not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('listLoginHistory', () => {
    it('テナントのログイン履歴を返す', async () => {
      const rows = [makeLoginHistory()];
      mockFindLogin.mockResolvedValue(rows);
      const result = await service.listLoginHistory(1);
      expect(result).toEqual(rows);
      expect(mockFindLogin).toHaveBeenCalledWith(1);
    });
  });

  describe('listEditHistory', () => {
    it('テナントの編集履歴を返す', async () => {
      const rows = [makeEditHistory()];
      mockFindEdit.mockResolvedValue(rows);
      const result = await service.listEditHistory(1);
      expect(result).toEqual(rows);
      expect(mockFindEdit).toHaveBeenCalledWith(1);
    });
  });
});
