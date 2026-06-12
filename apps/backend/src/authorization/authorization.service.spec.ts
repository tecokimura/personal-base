import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import type { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';
import { Permission, RoleType, ScopeType } from './constants';

const mockAssignment = (roleType: number) => ({
  id: 1,
  tenantId: 1,
  userAccountId: 1,
  roleType,
  scopeType: ScopeType.TENANT_ALL,
  scopeId: 0,
  effectiveFrom: new Date(),
  effectiveTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let mockGetActiveRoles: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetActiveRoles = vi.fn();
    const roleAssignmentService = {
      getActiveRoles: mockGetActiveRoles,
    } as unknown as RoleAssignmentService;
    service = new AuthorizationService(roleAssignmentService);
  });

  describe('can', () => {
    it('HR_ADMIN の MANAGE_EMPLOYEE 権限を許可する', async () => {
      mockGetActiveRoles.mockResolvedValue([mockAssignment(RoleType.HR_ADMIN)]);

      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.MANAGE_EMPLOYEE,
        1,
      );

      expect(result).toBe(true);
    });

    it('EMPLOYEE の MANAGE_EMPLOYEE 権限を拒否する', async () => {
      mockGetActiveRoles.mockResolvedValue([mockAssignment(RoleType.EMPLOYEE)]);

      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.MANAGE_EMPLOYEE,
        1,
      );

      expect(result).toBe(false);
    });

    it('他テナントへのアクセスを拒否し DB を参照しない', async () => {
      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.MANAGE_EMPLOYEE,
        2,
      );

      expect(result).toBe(false);
      expect(mockGetActiveRoles).not.toHaveBeenCalled();
    });

    it('複数ロールの和集合で判定する（EMPLOYEE + HR_ADMIN → 許可）', async () => {
      mockGetActiveRoles.mockResolvedValue([
        mockAssignment(RoleType.EMPLOYEE),
        mockAssignment(RoleType.HR_ADMIN),
      ]);

      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.MANAGE_EMPLOYEE,
        1,
      );

      expect(result).toBe(true);
    });

    it('ORG_ADMIN は MANAGE_SOFT_DELETED を許可する', async () => {
      mockGetActiveRoles.mockResolvedValue([
        mockAssignment(RoleType.ORG_ADMIN),
      ]);

      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.MANAGE_SOFT_DELETED,
        1,
      );

      expect(result).toBe(true);
    });

    it('EXECUTIVE_VIEWER は VIEW_ALL_EMPLOYEES を許可する', async () => {
      mockGetActiveRoles.mockResolvedValue([
        mockAssignment(RoleType.EXECUTIVE_VIEWER),
      ]);

      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.VIEW_ALL_EMPLOYEES,
        1,
      );

      expect(result).toBe(true);
    });

    it('EXECUTIVE_VIEWER は MANAGE_EMPLOYEE を拒否する', async () => {
      mockGetActiveRoles.mockResolvedValue([
        mockAssignment(RoleType.EXECUTIVE_VIEWER),
      ]);

      const result = await service.can(
        { userAccountId: 1, tenantId: 1, employeeId: 1 },
        Permission.MANAGE_EMPLOYEE,
        1,
      );

      expect(result).toBe(false);
    });
  });

  describe('assertCan', () => {
    it('権限があれば例外をスローしない', async () => {
      mockGetActiveRoles.mockResolvedValue([mockAssignment(RoleType.HR_ADMIN)]);

      await expect(
        service.assertCan(
          { userAccountId: 1, tenantId: 1, employeeId: 1 },
          Permission.MANAGE_EMPLOYEE,
          1,
        ),
      ).resolves.toBeUndefined();
    });

    it('権限がなければ ForbiddenException をスローする', async () => {
      mockGetActiveRoles.mockResolvedValue([mockAssignment(RoleType.EMPLOYEE)]);

      await expect(
        service.assertCan(
          { userAccountId: 1, tenantId: 1, employeeId: 1 },
          Permission.MANAGE_EMPLOYEE,
          1,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('他テナントなら ForbiddenException をスローする', async () => {
      await expect(
        service.assertCan(
          { userAccountId: 1, tenantId: 1, employeeId: 1 },
          Permission.MANAGE_EMPLOYEE,
          2,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
