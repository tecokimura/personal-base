import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeDirectoryService } from './employee-directory.service';
import { EMPLOYMENT_STATUS } from './employment.repository';
import type { EmployeeRepository } from './employee.repository';
import type { EmploymentRepository } from './employment.repository';
import type { AuthorizationService } from '../authorization/authorization.service';
import type { ScopeResolverService } from '../authorization/scope-resolver.service';
import type { StorageService } from '../storage/storage.service';
import type { PositionMasterRepository } from '../position-master/position-master.repository';
import type { AuditService } from '../audit/audit.service';

const makeEmployee = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  employeeNumber: 'EMP001',
  fullName: '山田 太郎',
  displayName: null as string | null,
  email: null as string | null,
  birthDate: null as Date | null,
  photoStorageKey: null as string | null,
  profileFreeText: null as string | null,
  isDeleted: false,
  deletedAt: null as Date | null,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeEmployment = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  tenantId: 1,
  employeeId: 1,
  organizationId: 5,
  positionMasterId: null as number | null,
  employmentType: 1,
  supervisorEmployeeId: null as number | null,
  startDate: new Date('2026-01-01'),
  endDate: null as Date | null,
  status: EMPLOYMENT_STATUS.ACTIVE,
  updatedBy: null as number | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const ctx = { userAccountId: 99, employeeId: 99, tenantId: 1 };

describe('EmployeeDirectoryService', () => {
  let service: EmployeeDirectoryService;
  let employeeRepo: Record<string, ReturnType<typeof vi.fn>>;
  let employmentRepo: Record<string, ReturnType<typeof vi.fn>>;
  let authzService: Record<string, ReturnType<typeof vi.fn>>;
  let scopeResolver: Record<string, ReturnType<typeof vi.fn>>;
  let storageService: Record<string, ReturnType<typeof vi.fn>>;
  let positionMasterRepo: Record<string, ReturnType<typeof vi.fn>>;
  let auditService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    employeeRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      findDeleted: vi.fn(),
      employeeNumberExists: vi.fn().mockResolvedValue(false),
      generatePlaceholderNumber: vi.fn().mockResolvedValue('TEMP000001'),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
      existsInTenant: vi.fn().mockResolvedValue(true),
      findEmployeeIdByUserAccount: vi.fn().mockResolvedValue(null),
      findByOrgIds: vi.fn().mockResolvedValue([]),
      findBySamePrimaryOrg: vi.fn().mockResolvedValue([]),
      hasActiveEmploymentInOrgs: vi.fn().mockResolvedValue(true),
      findDeletedByOrgIds: vi.fn().mockResolvedValue([]),
      hasDeletedEmploymentInOrgs: vi.fn().mockResolvedValue(true),
    };

    employmentRepo = {
      findById: vi.fn(),
      findByEmployeeId: vi.fn().mockResolvedValue([]),
      hasActivePrimaryAssignment: vi.fn().mockResolvedValue(false),
      hasOverlappingActiveEmployment: vi.fn().mockResolvedValue(false),
      hasActiveEmployments: vi.fn().mockResolvedValue(false),
      organizationExistsInTenant: vi.fn().mockResolvedValue(true),
      create: vi.fn(),
      update: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
      markDeleted: vi.fn().mockResolvedValue(undefined),
      markAllActiveDeleted: vi.fn().mockResolvedValue(undefined),
    };

    authzService = {
      assertCan: vi.fn().mockResolvedValue(undefined),
      can: vi.fn().mockResolvedValue(true),
    };

    scopeResolver = {
      resolveOrgAccess: vi.fn().mockResolvedValue({ kind: 'TENANT_ALL' }),
    };

    storageService = {
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      resolveAbsolutePath: vi.fn().mockReturnValue('/tmp/test'),
    };

    positionMasterRepo = {
      findNamesByIds: vi.fn().mockResolvedValue(new Map()),
    };

    auditService = {
      logEdit: vi.fn().mockResolvedValue(undefined),
    };

    service = new EmployeeDirectoryService(
      employeeRepo as unknown as EmployeeRepository,
      employmentRepo as unknown as EmploymentRepository,
      authzService as unknown as AuthorizationService,
      scopeResolver as unknown as ScopeResolverService,
      storageService as unknown as StorageService,
      positionMasterRepo as unknown as PositionMasterRepository,
      auditService as unknown as AuditService,
    );
  });

  // --- findAll ---

  describe('findAll', () => {
    it('returns all active employees for TENANT_ALL scope', async () => {
      const employees = [makeEmployee()];
      employeeRepo.findAll.mockResolvedValue(employees);

      const result = await service.findAll(ctx);

      expect(result).toHaveLength(1);
      expect(employeeRepo.findAll).toHaveBeenCalledWith(1);
    });

    it('returns ManagerView (includes employeeNumber and birthDate) for TENANT_ALL scope', async () => {
      const employee = makeEmployee({ employeeNumber: 'EMP001', birthDate: new Date('1990-01-01') });
      employeeRepo.findAll.mockResolvedValue([employee]);

      const result = await service.findAll(ctx);

      expect(result[0]).toHaveProperty('employeeNumber', 'EMP001');
      expect(result[0]).toHaveProperty('birthDate');
      expect(result[0]).not.toHaveProperty('isDeleted');
      expect(result[0]).not.toHaveProperty('updatedBy');
    });

    it('returns PublicView (excludes employeeNumber and birthDate) for PRIMARY_ORG scope', async () => {
      const employee = makeEmployee({ employeeNumber: 'EMP001', birthDate: new Date('1990-01-01') });
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 5 });
      employeeRepo.findEmployeeIdByUserAccount.mockResolvedValue(1);
      employeeRepo.findBySamePrimaryOrg.mockResolvedValue([employee]);

      const result = await service.findAll(ctx);

      expect(result[0]).not.toHaveProperty('employeeNumber');
      expect(result[0]).not.toHaveProperty('birthDate');
      expect(result[0]).not.toHaveProperty('isDeleted');
    });

    it('returns ManagerView for ORG_TREE scope', async () => {
      const employee = makeEmployee({ employeeNumber: 'EMP001' });
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findByOrgIds.mockResolvedValue([employee]);

      const result = await service.findAll(ctx);

      expect(result[0]).toHaveProperty('employeeNumber', 'EMP001');
    });
  });

  // --- findDeleted ---

  describe('findDeleted', () => {
    it('returns all deleted employees for TENANT_ALL scope', async () => {
      const deleted = [makeEmployee({ isDeleted: true })];
      employeeRepo.findDeleted.mockResolvedValue(deleted);

      const result = await service.findDeleted(ctx);

      expect(result).toEqual(deleted);
      expect(employeeRepo.findDeleted).toHaveBeenCalledWith(1);
    });

    it('returns only in-scope deleted employees for ORG_TREE scope', async () => {
      const deleted = [makeEmployee({ isDeleted: true })];
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findDeletedByOrgIds.mockResolvedValue(deleted);

      const result = await service.findDeleted(ctx);

      expect(result).toEqual(deleted);
      expect(employeeRepo.findDeletedByOrgIds).toHaveBeenCalledWith(1, new Set([5]));
      expect(employeeRepo.findDeleted).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when not authorized', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(service.findDeleted(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // --- findById ---

  describe('findById', () => {
    it('returns employee detail with employments for TENANT_ALL scope', async () => {
      const employee = makeEmployee();
      const primary = makeEmployment();
      const employments = [primary];
      employeeRepo.findById.mockResolvedValue(employee);
      employmentRepo.findByEmployeeId.mockResolvedValue(employments);

      const result = await service.findById(ctx, 1);

      expect(result.id).toBe(1);
      expect(result.employments[0]).toMatchObject(employments[0]);
      expect(result.employments[0]).toHaveProperty('positionName', null);
      expect(result.primaryEmployment).toMatchObject(primary);
      expect((result.primaryEmployment as { positionName: unknown })?.positionName).toBeNull();
    });

    it('includes employeeNumber and birthDate for TENANT_ALL scope', async () => {
      const employee = makeEmployee({ employeeNumber: 'EMP001', birthDate: new Date('1990-01-01') });
      employeeRepo.findById.mockResolvedValue(employee);

      const result = await service.findById(ctx, 1);

      expect(result).toHaveProperty('employeeNumber', 'EMP001');
      expect(result).toHaveProperty('birthDate');
    });

    it('returns PublicDetail (no employeeNumber, employmentType) for PRIMARY_ORG scope', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 5 });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 2, employeeNumber: 'EMP002' }));
      employeeRepo.findEmployeeIdByUserAccount.mockResolvedValue(99); // caller ≠ target
      employmentRepo.findByEmployeeId.mockResolvedValue([makeEmployment({ employeeId: 2, organizationId: 5, employmentType: 2 })]);

      const result = await service.findById(ctx, 2);

      expect(result).not.toHaveProperty('employeeNumber');
      expect(result).not.toHaveProperty('birthDate');
      // employment view should not expose employmentType
      expect(result.employments[0]).not.toHaveProperty('employmentType');
    });

    it('allows EMPLOYEE to view own detail', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 5 });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 1 }));
      employeeRepo.findEmployeeIdByUserAccount.mockResolvedValue(1); // caller is target

      const result = await service.findById(ctx, 1);

      expect(result.id).toBe(1);
    });

    it('throws NotFoundException when EMPLOYEE scope and target in different primary org', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 5 });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 2 }));
      employeeRepo.findEmployeeIdByUserAccount.mockResolvedValue(1); // caller is id=1, not id=2
      employmentRepo.findByEmployeeId.mockResolvedValue([makeEmployment({ organizationId: 99 })]); // different org

      await expect(service.findById(ctx, 2)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when ORG_TREE scope and target not in scope', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.hasActiveEmploymentInOrgs.mockResolvedValue(false);

      await expect(service.findById(ctx, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.findById(ctx, 99)).rejects.toThrow(NotFoundException);
    });
  });

  // --- getEmployments ---

  describe('getEmployments', () => {
    it('returns full employment list for TENANT_ALL scope', async () => {
      const employments = [makeEmployment()];
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findByEmployeeId.mockResolvedValue(employments);

      const result = await service.getEmployments(ctx, 1);

      expect(result[0]).toMatchObject(employments[0]);
      expect(result[0]).toHaveProperty('positionName', null);
    });

    it('returns PublicView (no employmentType) for PRIMARY_ORG scope', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 5 });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 1 }));
      employeeRepo.findEmployeeIdByUserAccount.mockResolvedValue(1); // self access
      employmentRepo.findByEmployeeId.mockResolvedValue([makeEmployment({ employmentType: 2 })]);

      const result = await service.getEmployments(ctx, 1);

      expect(result[0]).not.toHaveProperty('employmentType');
    });

    it('throws NotFoundException when EMPLOYEE scope and target out of scope', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'PRIMARY_ORG', orgId: 5 });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 2 }));
      employeeRepo.findEmployeeIdByUserAccount.mockResolvedValue(1); // caller is not target
      employmentRepo.findByEmployeeId.mockResolvedValue([makeEmployment({ organizationId: 99 })]); // different org

      await expect(service.getEmployments(ctx, 2)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.getEmployments(ctx, 99)).rejects.toThrow(NotFoundException);
    });
  });

  // --- create ---

  describe('create', () => {
    it('creates employee with given employeeNumber', async () => {
      const employee = makeEmployee();
      employeeRepo.create.mockResolvedValue(employee);

      const result = await service.create(ctx, {
        fullName: '山田 太郎',
        employeeNumber: 'EMP001',
      });

      expect(result).toEqual(employee);
      expect(employeeRepo.employeeNumberExists).toHaveBeenCalledWith(1, 'EMP001');
      expect(employeeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ employeeNumber: 'EMP001', fullName: '山田 太郎' }),
      );
    });

    it('auto-generates placeholder number when not provided', async () => {
      const employee = makeEmployee({ employeeNumber: 'TEMP000001' });
      employeeRepo.create.mockResolvedValue(employee);

      await service.create(ctx, { fullName: '鈴木 花子' });

      expect(employeeRepo.generatePlaceholderNumber).toHaveBeenCalledWith(1);
      expect(employeeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ employeeNumber: 'TEMP000001' }),
      );
    });

    it('throws ConflictException when employee number already taken', async () => {
      employeeRepo.employeeNumberExists.mockResolvedValue(true);

      await expect(
        service.create(ctx, { fullName: '山田', employeeNumber: 'EMP001' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException without MANAGE_EMPLOYEE permission', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(service.create(ctx, { fullName: '山田' })).rejects.toThrow(ForbiddenException);
    });
  });

  // --- update ---

  describe('update', () => {
    it('updates employee fields', async () => {
      const employee = makeEmployee();
      employeeRepo.findById.mockResolvedValue(employee);
      employeeRepo.update.mockResolvedValue({ ...employee, fullName: '新しい名前' });

      const result = await service.update(ctx, 1, { fullName: '新しい名前' });

      expect(result.fullName).toBe('新しい名前');
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.update(ctx, 99, { fullName: '名前' })).rejects.toThrow(NotFoundException);
    });
  });

  // --- softDelete ---

  describe('softDelete', () => {
    it('soft deletes employee and marks active employments deleted', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());

      await service.softDelete(ctx, 1);

      expect(employmentRepo.markAllActiveDeleted).toHaveBeenCalledWith(1, 1, expect.any(Date), 99);
      expect(employeeRepo.softDelete).toHaveBeenCalledWith(1, 1, expect.any(Date), 99);
    });

    it('throws ConflictException if already deleted', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ isDeleted: true }));

      await expect(service.softDelete(ctx, 1)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.softDelete(ctx, 99)).rejects.toThrow(NotFoundException);
    });
  });

  // --- restore ---

  describe('restore', () => {
    it('restores a soft-deleted employee for TENANT_ALL scope', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ isDeleted: true }));

      await service.restore(ctx, 1);

      expect(employeeRepo.restore).toHaveBeenCalledWith(1, 1, 99);
    });

    it('restores when ORG_TREE scope and employee is in scope', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ isDeleted: true }));
      employeeRepo.hasDeletedEmploymentInOrgs.mockResolvedValue(true);

      await service.restore(ctx, 1);

      expect(employeeRepo.restore).toHaveBeenCalledWith(1, 1, 99);
    });

    it('throws NotFoundException when ORG_TREE scope and deleted employee is outside scope', async () => {
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findById.mockResolvedValue(makeEmployee({ isDeleted: true }));
      employeeRepo.hasDeletedEmploymentInOrgs.mockResolvedValue(false);

      await expect(service.restore(ctx, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if employee is not deleted', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ isDeleted: false }));

      await expect(service.restore(ctx, 1)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.restore(ctx, 99)).rejects.toThrow(NotFoundException);
    });
  });

  // --- addEmployment ---

  describe('addEmployment', () => {
    const input = {
      organizationId: 5,
      employmentType: 1,
      startDate: new Date('2026-04-01'),
    };

    it('creates new employment successfully', async () => {
      const employment = makeEmployment();
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.create.mockResolvedValue(employment);

      const result = await service.addEmployment(ctx, 1, input);

      expect(result).toEqual(employment);
      expect(employmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 1,
          organizationId: 5,
          status: EMPLOYMENT_STATUS.ACTIVE,
        }),
      );
    });

    it('throws ConflictException when overlapping active employment exists', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.hasOverlappingActiveEmployment.mockResolvedValue(true);

      await expect(service.addEmployment(ctx, 1, input)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when organization not found', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.organizationExistsInTenant.mockResolvedValue(false);

      await expect(service.addEmployment(ctx, 1, input)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when supervisor employee not found in tenant', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.existsInTenant.mockResolvedValue(false);

      await expect(
        service.addEmployment(ctx, 1, { ...input, supervisorEmployeeId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.addEmployment(ctx, 99, input)).rejects.toThrow(NotFoundException);
    });
  });

  // --- terminateEmployment ---

  describe('terminateEmployment', () => {
    it('terminates an active employment', async () => {
      const employment = makeEmployment();
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(employment);

      await service.terminateEmployment(ctx, 1, 10, new Date('2026-12-31'));

      expect(employmentRepo.terminate).toHaveBeenCalledWith(10, 1, new Date('2026-12-31'), 99);
    });

    it('throws ConflictException when already terminated', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(
        makeEmployment({ endDate: new Date('2026-06-01') }),
      );

      await expect(service.terminateEmployment(ctx, 1, 10, new Date('2026-12-31'))).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws UnprocessableEntityException when endDate is before startDate', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(makeEmployment({ startDate: new Date('2026-06-01') }));

      await expect(
        service.terminateEmployment(ctx, 1, 10, new Date('2026-01-01')),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException when employment does not belong to employee', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(makeEmployment({ employeeId: 999 }));

      await expect(service.terminateEmployment(ctx, 1, 10, new Date('2026-12-31'))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- assistUpdateProfile ---

  describe('assistUpdateProfile', () => {
    it('updates profileFreeText when caller has MANAGE_EMPLOYEE', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.update.mockResolvedValue(makeEmployee());

      await service.assistUpdateProfile(ctx, 1, { profileFreeText: 'Hello' });

      expect(employeeRepo.update).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ profileFreeText: 'Hello' }),
      );
    });

    it('allows MANAGER (ASSIST_UPDATE_PROFILE + ORG_TREE) to update profileFreeText', async () => {
      // Simulate MANAGER: no MANAGE_EMPLOYEE, but has ASSIST_UPDATE_PROFILE
      authzService.can.mockImplementation((_ctx, permission) =>
        Promise.resolve(permission === 'ASSIST_UPDATE_PROFILE'),
      );
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.hasActiveEmploymentInOrgs.mockResolvedValue(true);
      employeeRepo.update.mockResolvedValue(makeEmployee());

      await service.assistUpdateProfile(ctx, 1, { profileFreeText: '自己紹介' });

      expect(employeeRepo.update).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ profileFreeText: '自己紹介' }),
      );
    });

    it('throws ForbiddenException when MANAGER tries to update employee outside ORG_TREE', async () => {
      authzService.can.mockImplementation((_ctx, permission) =>
        Promise.resolve(permission === 'ASSIST_UPDATE_PROFILE'),
      );
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.hasActiveEmploymentInOrgs.mockResolvedValue(false); // not in scope

      await expect(service.assistUpdateProfile(ctx, 1, { profileFreeText: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when caller has no permission', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      authzService.can.mockResolvedValue(false);

      await expect(service.assistUpdateProfile(ctx, 1, { profileFreeText: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.assistUpdateProfile(ctx, 99, {})).rejects.toThrow(NotFoundException);
    });
  });

  // --- setSupervisorEmployee ---

  describe('setSupervisorEmployee', () => {
    it('sets supervisorEmployeeId on an employment', async () => {
      const employment = makeEmployment({ supervisorEmployeeId: null });
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(employment);
      employmentRepo.update.mockResolvedValue({ ...employment, supervisorEmployeeId: 2 });

      const result = await service.setSupervisorEmployee(ctx, 1, 10, 2);

      expect(employmentRepo.update).toHaveBeenCalledWith(
        10,
        1,
        expect.objectContaining({ supervisorEmployeeId: 2 }),
      );
      expect(result.supervisorEmployeeId).toBe(2);
    });

    it('allows setting supervisorEmployeeId to null (remove manager)', async () => {
      const employment = makeEmployment({ supervisorEmployeeId: 5 });
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(employment);
      employmentRepo.update.mockResolvedValue({ ...employment, supervisorEmployeeId: null });

      await service.setSupervisorEmployee(ctx, 1, 10, null);

      expect(employmentRepo.update).toHaveBeenCalledWith(
        10,
        1,
        expect.objectContaining({ supervisorEmployeeId: null }),
      );
    });

    it('allows MANAGER (ASSIST_UPDATE_PROFILE + ORG_TREE) to set manager', async () => {
      authzService.can.mockImplementation((_ctx, permission) =>
        Promise.resolve(permission === 'ASSIST_UPDATE_PROFILE'),
      );
      scopeResolver.resolveOrgAccess.mockResolvedValue({ kind: 'ORG_TREE', orgIds: new Set([5]) });
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.hasActiveEmploymentInOrgs.mockResolvedValue(true);
      employmentRepo.findById.mockResolvedValue(makeEmployment());
      employmentRepo.update.mockResolvedValue(makeEmployment({ supervisorEmployeeId: 3 }));

      await service.setSupervisorEmployee(ctx, 1, 10, 3);

      expect(employmentRepo.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when manager employee not in tenant', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.findById.mockResolvedValue(makeEmployment());
      employeeRepo.existsInTenant.mockResolvedValue(false);

      await expect(service.setSupervisorEmployee(ctx, 1, 10, 999)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller has no permission', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      authzService.can.mockResolvedValue(false);

      await expect(service.setSupervisorEmployee(ctx, 1, 10, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  // --- uploadPhoto ---

  describe('uploadPhoto', () => {
    it('saves file and returns storage key', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employeeRepo.update.mockResolvedValue(makeEmployee());

      const result = await service.uploadPhoto(ctx, 1, Buffer.from('data'), 'image/jpeg');

      expect(storageService.save).toHaveBeenCalledWith(
        expect.stringMatching(/^photos\/1\/.+\.jpg$/),
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(employeeRepo.update).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ photoStorageKey: expect.stringMatching(/^photos\/1\/.+\.jpg$/) }),
      );
      expect(result).toMatch(/^photos\/1\/.+\.jpg$/);
    });

    it('deletes old file when replacing existing photo', async () => {
      const oldKey = 'photos/1/old.jpg';
      employeeRepo.findById.mockResolvedValue(makeEmployee({ photoStorageKey: oldKey }));
      employeeRepo.update.mockResolvedValue(makeEmployee());

      await service.uploadPhoto(ctx, 1, Buffer.from('data'), 'image/png');

      expect(storageService.save).toHaveBeenCalled();
      expect(storageService.delete).toHaveBeenCalledWith(oldKey);
    });

    it('does not delete old file when employee had no photo', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ photoStorageKey: null }));
      employeeRepo.update.mockResolvedValue(makeEmployee());

      await service.uploadPhoto(ctx, 1, Buffer.from('data'), 'image/png');

      expect(storageService.delete).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException for unsupported mime type', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());

      await expect(
        service.uploadPhoto(ctx, 1, Buffer.from('data'), 'image/bmp'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(
        service.uploadPhoto(ctx, 99, Buffer.from('data'), 'image/png'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException without MANAGE_EMPLOYEE or ASSIST_UPDATE_PROFILE permission', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      authzService.can.mockResolvedValue(false);

      await expect(
        service.uploadPhoto(ctx, 1, Buffer.from('data'), 'image/jpeg'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- deletePhoto ---

  describe('deletePhoto', () => {
    it('deletes file from storage and clears photoStorageKey', async () => {
      const key = 'photos/1/abc.jpg';
      employeeRepo.findById.mockResolvedValue(makeEmployee({ photoStorageKey: key }));
      employeeRepo.update.mockResolvedValue(makeEmployee({ photoStorageKey: null }));

      await service.deletePhoto(ctx, 1);

      expect(storageService.delete).toHaveBeenCalledWith(key);
      expect(employeeRepo.update).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ photoStorageKey: null }),
      );
    });

    it('does nothing when employee has no photo', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ photoStorageKey: null }));

      await service.deletePhoto(ctx, 1);

      expect(storageService.delete).not.toHaveBeenCalled();
      expect(employeeRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.deletePhoto(ctx, 99)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException without MANAGE_EMPLOYEE or ASSIST_UPDATE_PROFILE permission', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      authzService.can.mockResolvedValue(false);

      await expect(service.deletePhoto(ctx, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // --- tenant isolation ---

  describe('tenant isolation', () => {
    it('does not return employees from another tenant', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.findById({ userAccountId: 99, employeeId: 99, tenantId: 2 }, 1)).rejects.toThrow(NotFoundException);
    });

    it('addEmployment rejects cross-tenant organization', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      employmentRepo.organizationExistsInTenant.mockResolvedValue(false);

      await expect(
        service.addEmployment(ctx, 1, {
          organizationId: 999,
          employmentType: 1,
          startDate: new Date('2026-01-01'),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('他テナントの論理削除社員を復元できない', async () => {
      // Repository scopes findById by tenantId — cross-tenant employee is not found
      const crossTenantCtx = { userAccountId: 99, employeeId: 99, tenantId: 2 };
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.restore(crossTenantCtx, 1)).rejects.toThrow(NotFoundException);
    });

    it('別テナントコンテキストでの書き込みは AuthorizationService の tenantId チェックで拒否される', async () => {
      // AuthorizationService.assertCan は tenantId 不一致の場合に ForbiddenException を投げる。
      // RoleAssignment の cross-tenant isolation は authorization.service.spec.ts で直接確認済み。
      authzService.assertCan.mockRejectedValue(new ForbiddenException());
      const crossTenantCtx = { userAccountId: 99, employeeId: 99, tenantId: 2 };

      await expect(service.create(crossTenantCtx, { fullName: '山田' })).rejects.toThrow(ForbiddenException);
    });
  });
});
