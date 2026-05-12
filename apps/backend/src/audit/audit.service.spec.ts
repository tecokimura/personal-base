import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';
import type { AuditRepository } from './audit.repository';
import type { AuditEventDto } from './dto/audit-event.dto';

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

const makeEditHistory = (overrides: Record<string, unknown> = {}) => {
  const base = {
    id: 1,
    tenantId: 1,
    entityType: 'Employee',
    entityId: 1,
    actionType: 'CREATE',
    changedByEmployeeId: 1,
    changedAt: new Date(),
    scopeSummary: null,
    ...overrides,
  };
  // resolvedEmployeeId: repository resolves Employee → entityId, others → overridden or null
  const entityType = base.entityType as string;
  const resolvedEmployeeId =
    overrides.resolvedEmployeeId !== undefined
      ? (overrides.resolvedEmployeeId as number | null)
      : entityType === 'Employee'
        ? (base.entityId as number)
        : null;
  return { ...base, resolvedEmployeeId };
};

describe('AuditService', () => {
  let service: AuditService;
  let mockCreateLogin: ReturnType<typeof vi.fn>;
  let mockCreateEdit: ReturnType<typeof vi.fn>;
  let mockFindLogin: ReturnType<typeof vi.fn>;
  let mockFindEdit: ReturnType<typeof vi.fn>;
  let mockFindEditWithTarget: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateLogin = vi.fn().mockResolvedValue(undefined);
    mockCreateEdit = vi.fn().mockResolvedValue(undefined);
    mockFindLogin = vi.fn();
    mockFindEdit = vi.fn();
    mockFindEditWithTarget = vi.fn();

    const repo = {
      createLoginHistory: mockCreateLogin,
      createEditHistory: mockCreateEdit,
      findLoginHistoryByTenant: mockFindLogin,
      findEditHistoryByTenant: mockFindEdit,
      findEditHistoryWithTargetByTenant: mockFindEditWithTarget,
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

  describe('listEvents', () => {
    it('ログイン履歴と編集履歴を統合して occurredAt 降順で返す', async () => {
      const login = makeLoginHistory({ loggedInAt: new Date('2024-02-01') });
      const edit = makeEditHistory({ changedAt: new Date('2024-03-01') });
      mockFindLogin.mockResolvedValue([login]);
      mockFindEditWithTarget.mockResolvedValue([edit]);

      const result = await service.listEvents(1);

      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe('EDIT');
      expect(result[1].eventType).toBe('LOGIN');
    });

    it('LOGIN イベントのフィールドマッピングが正しい', async () => {
      const login = makeLoginHistory({ employeeId: 5, loggedInAt: new Date('2024-01-15') });
      mockFindLogin.mockResolvedValue([login]);
      mockFindEditWithTarget.mockResolvedValue([]);

      const [event] = await service.listEvents(1) as AuditEventDto[];

      expect(event.eventType).toBe('LOGIN');
      expect(event.actorEmployeeId).toBe(5);
      expect(event.targetEmployeeId).toBe(5);
      expect(event.targetType).toBeNull();
      expect(event.operationType).toBe('LOGIN');
      expect(event.occurredAt).toEqual(login.loggedInAt);
    });

    it('EDIT イベントのフィールドマッピングが正しい（entityType=Employee）', async () => {
      const edit = makeEditHistory({ changedByEmployeeId: 3, entityType: 'Employee', entityId: 7, actionType: 'UPDATE' });
      mockFindLogin.mockResolvedValue([]);
      mockFindEditWithTarget.mockResolvedValue([edit]);

      const [event] = await service.listEvents(1) as AuditEventDto[];

      expect(event.eventType).toBe('EDIT');
      expect(event.actorEmployeeId).toBe(3);
      expect(event.targetEmployeeId).toBe(7);
      expect(event.targetType).toBe('Employee');
      expect(event.operationType).toBe('UPDATE');
    });

    it('entityType=WorkHistory の場合 resolvedEmployeeId が targetEmployeeId になる', async () => {
      const edit = makeEditHistory({ entityType: 'WorkHistory', entityId: 10, changedByEmployeeId: 2, resolvedEmployeeId: 9 });
      mockFindLogin.mockResolvedValue([]);
      mockFindEditWithTarget.mockResolvedValue([edit]);

      const [event] = await service.listEvents(1) as AuditEventDto[];

      expect(event.targetEmployeeId).toBe(9);
      expect(event.targetType).toBe('WorkHistory');
    });

    it('entityType=Employment の場合 resolvedEmployeeId が targetEmployeeId になる', async () => {
      const edit = makeEditHistory({ entityType: 'Employment', entityId: 5, changedByEmployeeId: 2, resolvedEmployeeId: 4 });
      mockFindLogin.mockResolvedValue([]);
      mockFindEditWithTarget.mockResolvedValue([edit]);

      const [event] = await service.listEvents(1) as AuditEventDto[];

      expect(event.targetEmployeeId).toBe(4);
      expect(event.targetType).toBe('Employment');
    });

    it('entityType が Organization など社員に紐づかない場合 targetEmployeeId は null', async () => {
      const edit = makeEditHistory({ entityType: 'Organization', entityId: 2, actionType: 'CREATE', resolvedEmployeeId: null });
      mockFindLogin.mockResolvedValue([]);
      mockFindEditWithTarget.mockResolvedValue([edit]);

      const [event] = await service.listEvents(1) as AuditEventDto[];

      expect(event.targetEmployeeId).toBeNull();
      expect(event.targetType).toBe('Organization');
    });

    it('ログインも編集もない場合は空配列を返す', async () => {
      mockFindLogin.mockResolvedValue([]);
      mockFindEditWithTarget.mockResolvedValue([]);
      const result = await service.listEvents(1);
      expect(result).toEqual([]);
    });
  });
});
