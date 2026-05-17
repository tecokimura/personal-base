import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { Employee, Employment } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthorizationService, AuthContext } from '../authorization/authorization.service';
import { ScopeResolverService, OrgAccess } from '../authorization/scope-resolver.service';
import { StorageService } from '../storage/storage.service';
import { Permission } from '../authorization/constants';
import { EmployeeRepository } from './employee.repository';
import { EmploymentRepository, EMPLOYMENT_STATUS } from './employment.repository';
import { PositionMasterRepository } from '../position-master/position-master.repository';
import { AuditService } from '../audit/audit.service';

export interface CreateEmployeeInput {
  fullName: string;
  employeeNumber?: string;
  displayName?: string;
  email?: string;
  birthDate?: Date;
  profileFreeText?: string;
}

export interface UpdateEmployeeInput {
  fullName?: string;
  displayName?: string;
  email?: string;
  birthDate?: Date;
  profileFreeText?: string;
}

export interface AssistUpdateProfileInput {
  profileFreeText?: string;
}

export interface AddEmploymentInput {
  organizationId: number;
  employmentType: number;
  isPrimaryAssignment: boolean;
  positionMasterId?: number;
  supervisorEmployeeId?: number;
  startDate: Date;
  status?: number;
}

export interface UpdateEmploymentInput {
  organizationId?: number;
  employmentType?: number;
  positionMasterId?: number;
  supervisorEmployeeId?: number;
  isPrimaryAssignment?: boolean;
  startDate?: Date;
}

// Returned to EMPLOYEE scope callers viewing colleagues (no employeeNumber, birthDate, etc.)
export interface EmployeePublicView {
  id: number;
  tenantId: number;
  fullName: string;
  displayName: string | null;
  email: string | null;
  photoStorageKey: string | null;
  profileFreeText: string | null;
}

// Returned to MANAGER/ORG_ADMIN/HR_ADMIN/EXECUTIVE_VIEWER scope
export interface EmployeeManagerView {
  id: number;
  tenantId: number;
  employeeNumber: string | null;
  fullName: string;
  displayName: string | null;
  email: string | null;
  birthDate: Date | null;
  photoStorageKey: string | null;
  profileFreeText: string | null;
}

// Employment view without employmentType (EMPLOYEE scope)
export interface EmploymentPublicView {
  id: number;
  tenantId: number;
  employeeId: number;
  organizationId: number;
  positionMasterId: number | null;
  positionName: string | null;
  isPrimaryAssignment: boolean;
  supervisorEmployeeId: number | null;
  startDate: Date;
  endDate: Date | null;
  status: number;
}

export type EmploymentWithPosition = Employment & { positionName: string | null };

export interface EmployeePublicDetail extends EmployeePublicView {
  primaryEmployment: EmploymentPublicView | null;
  employments: EmploymentPublicView[];
}

export interface EmployeeManagerDetail extends EmployeeManagerView {
  primaryEmployment: EmploymentWithPosition | null;
  employments: EmploymentWithPosition[];
}

const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class EmployeeDirectoryService {
  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly employmentRepo: EmploymentRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly scopeResolver: ScopeResolverService,
    private readonly storageService: StorageService,
    private readonly positionMasterRepo: PositionMasterRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(ctx: AuthContext): Promise<EmployeePublicView[] | EmployeeManagerView[]> {
    const access = await this.scopeResolver.resolveOrgAccess(ctx);

    if (access.kind === 'TENANT_ALL') {
      const employees = await this.employeeRepo.findAll(ctx.tenantId);
      return employees.map((e) => this.toManagerView(e));
    }

    if (access.kind === 'ORG_TREE') {
      const employees = await this.employeeRepo.findByOrgIds(ctx.tenantId, access.orgIds);
      return employees.map((e) => this.toManagerView(e));
    }

    // PRIMARY_ORG (EMPLOYEE role): same primary org + self, limited view
    const employeeId = await this.resolveEmployeeId(ctx);
    if (access.orgId === null || employeeId === null) {
      if (employeeId === null) return [];
      const self = await this.employeeRepo.findById(employeeId, ctx.tenantId);
      return self ? [this.toPublicView(self)] : [];
    }
    const employees = await this.employeeRepo.findBySamePrimaryOrg(ctx.tenantId, access.orgId, employeeId);
    return employees.map((e) => this.toPublicView(e));
  }

  async findDeleted(ctx: AuthContext): Promise<Employee[]> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_SOFT_DELETED, ctx.tenantId);
    const access = await this.scopeResolver.resolveOrgAccess(ctx);

    if (access.kind === 'ORG_TREE') {
      return this.employeeRepo.findDeletedByOrgIds(ctx.tenantId, access.orgIds);
    }
    return this.employeeRepo.findDeleted(ctx.tenantId);
  }

  async findById(ctx: AuthContext, id: number): Promise<EmployeePublicDetail | EmployeeManagerDetail> {
    const employee = await this.assertEmployeeExists(id, ctx.tenantId);
    const access = await this.scopeResolver.resolveOrgAccess(ctx);
    await this.assertEmployeeInScope(access, id, ctx);

    const [employments, primaryEmployment] = await Promise.all([
      this.employmentRepo.findByEmployeeId(id, ctx.tenantId),
      this.employmentRepo.findPrimaryActive(id, ctx.tenantId),
    ]);

    const positionMap = await this.resolvePositionNames(employments);

    if (access.kind === 'PRIMARY_ORG') {
      return {
        ...this.toPublicView(employee),
        primaryEmployment: primaryEmployment ? this.toPublicEmployment(primaryEmployment, positionMap) : null,
        employments: employments.map((e) => this.toPublicEmployment(e, positionMap)),
      };
    }

    return {
      ...this.toManagerView(employee),
      primaryEmployment: primaryEmployment ? this.withPosition(primaryEmployment, positionMap) : null,
      employments: employments.map((e) => this.withPosition(e, positionMap)),
    };
  }

  async create(ctx: AuthContext, input: CreateEmployeeInput): Promise<Employee> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);

    let employeeNumber = input.employeeNumber ?? null;

    if (employeeNumber) {
      const exists = await this.employeeRepo.employeeNumberExists(ctx.tenantId, employeeNumber);
      if (exists) {
        throw new ConflictException(`Employee number ${employeeNumber} is already in use`);
      }
    } else {
      employeeNumber = await this.employeeRepo.generatePlaceholderNumber(ctx.tenantId);
    }

    const employee = await this.employeeRepo.create({
      tenantId: ctx.tenantId,
      employeeNumber,
      fullName: input.fullName,
      displayName: input.displayName ?? null,
      email: input.email ?? null,
      birthDate: input.birthDate ?? null,
      photoStorageKey: null,
      profileFreeText: input.profileFreeText ?? null,
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: employee.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
    });
    return employee;
  }

  async update(ctx: AuthContext, id: number, input: UpdateEmployeeInput): Promise<Employee> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    await this.assertEmployeeExists(id, ctx.tenantId);

    const updated = await this.employeeRepo.update(id, ctx.tenantId, {
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.birthDate !== undefined && { birthDate: input.birthDate }),
      ...(input.profileFreeText !== undefined && { profileFreeText: input.profileFreeText }),
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: id,
      actionType: 'UPDATE',
      changedByEmployeeId: ctx.employeeId,
    });
    return updated;
  }

  async softDelete(ctx: AuthContext, id: number): Promise<void> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    const employee = await this.assertEmployeeExists(id, ctx.tenantId);

    if (employee.isDeleted) {
      throw new ConflictException('Employee is already deleted');
    }

    // Mark all active employments as deleted before soft-deleting the employee
    await this.employmentRepo.markAllActiveDeleted(id, ctx.tenantId, ctx.userAccountId);
    await this.employeeRepo.softDelete(id, ctx.tenantId, new Date(), ctx.userAccountId);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: id,
      actionType: 'SOFT_DELETE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  async restore(ctx: AuthContext, id: number): Promise<void> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_SOFT_DELETED, ctx.tenantId);

    const employee = await this.employeeRepo.findById(id, ctx.tenantId, true);
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);

    if (!employee.isDeleted) {
      throw new ConflictException('Employee is not deleted');
    }

    const access = await this.scopeResolver.resolveOrgAccess(ctx);
    if (access.kind === 'ORG_TREE') {
      const inScope = await this.employeeRepo.hasDeletedEmploymentInOrgs(id, ctx.tenantId, access.orgIds);
      if (!inScope) throw new NotFoundException(`Employee ${id} not found`);
    }

    // Restore employee only; employment re-assignment is a separate explicit operation
    await this.employeeRepo.restore(id, ctx.tenantId, ctx.userAccountId);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: id,
      actionType: 'RESTORE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  async getEmployments(
    ctx: AuthContext,
    employeeId: number,
  ): Promise<EmploymentWithPosition[] | EmploymentPublicView[]> {
    await this.assertEmployeeExists(employeeId, ctx.tenantId);
    const access = await this.scopeResolver.resolveOrgAccess(ctx);
    await this.assertEmployeeInScope(access, employeeId, ctx);

    const employments = await this.employmentRepo.findByEmployeeId(employeeId, ctx.tenantId);
    const positionMap = await this.resolvePositionNames(employments);

    if (access.kind === 'PRIMARY_ORG') {
      return employments.map((e) => this.toPublicEmployment(e, positionMap));
    }
    return employments.map((e) => this.withPosition(e, positionMap));
  }

  async addEmployment(
    ctx: AuthContext,
    employeeId: number,
    input: AddEmploymentInput,
  ): Promise<Employment> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    await this.assertEmployeeExists(employeeId, ctx.tenantId);
    await this.assertOrgExistsInTenant(input.organizationId, ctx.tenantId);

    if (input.supervisorEmployeeId !== undefined) {
      await this.assertEmployeeExistsInTenant(input.supervisorEmployeeId, ctx.tenantId);
    }

    if (input.isPrimaryAssignment) {
      const hasPrimary = await this.employmentRepo.hasActivePrimaryAssignment(
        employeeId,
        ctx.tenantId,
      );
      if (hasPrimary) {
        throw new ConflictException('Employee already has an active primary assignment');
      }
    }

    const startDate = input.startDate;
    const hasOverlap = await this.employmentRepo.hasOverlappingActiveEmployment(
      employeeId,
      input.organizationId,
      ctx.tenantId,
      startDate,
    );
    if (hasOverlap) {
      throw new ConflictException(
        'Employee already has an active employment at this organization with overlapping period',
      );
    }

    const employment = await this.employmentRepo.create({
      tenantId: ctx.tenantId,
      employeeId,
      organizationId: input.organizationId,
      positionMasterId: input.positionMasterId ?? null,
      employmentType: input.employmentType,
      isPrimaryAssignment: input.isPrimaryAssignment,
      supervisorEmployeeId: input.supervisorEmployeeId ?? null,
      startDate,
      status: input.status ?? EMPLOYMENT_STATUS.ACTIVE,
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employment',
      entityId: employment.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
      scopeSummary: `employeeId=${employeeId}`,
    });
    return employment;
  }

  async updateEmployment(
    ctx: AuthContext,
    employeeId: number,
    employmentId: number,
    input: UpdateEmploymentInput,
  ): Promise<Employment> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    await this.assertEmployeeExists(employeeId, ctx.tenantId);
    const employment = await this.assertEmploymentBelongsToEmployee(
      employmentId,
      employeeId,
      ctx.tenantId,
    );

    if (input.organizationId !== undefined) {
      await this.assertOrgExistsInTenant(input.organizationId, ctx.tenantId);
    }

    if (input.supervisorEmployeeId !== undefined) {
      await this.assertEmployeeExistsInTenant(input.supervisorEmployeeId, ctx.tenantId);
    }

    if (input.isPrimaryAssignment === true && !employment.isPrimaryAssignment) {
      const hasPrimary = await this.employmentRepo.hasActivePrimaryAssignment(
        employeeId,
        ctx.tenantId,
        employmentId,
      );
      if (hasPrimary) {
        throw new ConflictException('Employee already has an active primary assignment');
      }
    }

    if (input.startDate !== undefined) {
      if (employment.endDate && input.startDate > employment.endDate) {
        throw new UnprocessableEntityException('startDate must be on or before endDate');
      }
    }

    const updatedEmp = await this.employmentRepo.update(employmentId, ctx.tenantId, {
      ...(input.organizationId !== undefined && { organizationId: input.organizationId }),
      ...(input.employmentType !== undefined && { employmentType: input.employmentType }),
      ...(input.positionMasterId !== undefined && { positionMasterId: input.positionMasterId }),
      ...(input.supervisorEmployeeId !== undefined && {
        supervisorEmployeeId: input.supervisorEmployeeId,
      }),
      ...(input.isPrimaryAssignment !== undefined && {
        isPrimaryAssignment: input.isPrimaryAssignment,
      }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employment',
      entityId: employmentId,
      actionType: 'UPDATE',
      changedByEmployeeId: ctx.employeeId,
      scopeSummary: `employeeId=${employeeId}`,
    });
    return updatedEmp;
  }

  async terminateEmployment(
    ctx: AuthContext,
    employeeId: number,
    employmentId: number,
    endDate: Date,
  ): Promise<void> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    await this.assertEmployeeExists(employeeId, ctx.tenantId);
    const employment = await this.assertEmploymentBelongsToEmployee(
      employmentId,
      employeeId,
      ctx.tenantId,
    );

    if (employment.status === EMPLOYMENT_STATUS.RESIGNED) {
      throw new ConflictException('Employment is already terminated');
    }

    if (endDate < employment.startDate) {
      throw new UnprocessableEntityException('endDate must be on or after startDate');
    }

    await this.employmentRepo.terminate(employmentId, ctx.tenantId, endDate, ctx.userAccountId);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employment',
      entityId: employmentId,
      actionType: 'TERMINATE',
      changedByEmployeeId: ctx.employeeId,
      scopeSummary: `employeeId=${employeeId}`,
    });
  }

  async setPrimaryAssignment(
    ctx: AuthContext,
    employeeId: number,
    employmentId: number,
  ): Promise<Employment> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    await this.assertEmployeeExists(employeeId, ctx.tenantId);
    const employment = await this.assertEmploymentBelongsToEmployee(
      employmentId,
      employeeId,
      ctx.tenantId,
    );

    if (employment.status !== EMPLOYMENT_STATUS.ACTIVE) {
      throw new ConflictException('Cannot set a non-active employment as primary');
    }

    if (employment.isPrimaryAssignment) {
      throw new ConflictException('Employment is already the primary assignment');
    }

    const hasPrimary = await this.employmentRepo.hasActivePrimaryAssignment(
      employeeId,
      ctx.tenantId,
      employmentId,
    );
    if (hasPrimary) {
      throw new ConflictException(
        'Employee already has another active primary assignment. Terminate it first.',
      );
    }

    return this.employmentRepo.update(employmentId, ctx.tenantId, {
      isPrimaryAssignment: true,
      updatedBy: ctx.userAccountId,
    });
  }

  async assistUpdateProfile(
    ctx: AuthContext,
    employeeId: number,
    input: AssistUpdateProfileInput,
  ): Promise<void> {
    const employee = await this.assertEmployeeExists(employeeId, ctx.tenantId);
    await this.assertCanEditProfile(ctx, employeeId);

    if (input.profileFreeText !== undefined) {
      await this.employeeRepo.update(employee.id, ctx.tenantId, {
        profileFreeText: input.profileFreeText,
        updatedBy: ctx.userAccountId,
      });
      void this.auditService.logEdit({
        tenantId: ctx.tenantId,
        entityType: 'Employee',
        entityId: employeeId,
        actionType: 'ASSIST_UPDATE',
        changedByEmployeeId: ctx.employeeId,
        scopeSummary: 'profileFreeText',
      });
    }
  }

  async setSupervisorEmployee(
    ctx: AuthContext,
    employeeId: number,
    employmentId: number,
    supervisorEmployeeId: number | null,
  ): Promise<Employment> {
    await this.assertEmployeeExists(employeeId, ctx.tenantId);
    await this.assertCanEditProfile(ctx, employeeId);
    const employment = await this.assertEmploymentBelongsToEmployee(employmentId, employeeId, ctx.tenantId);

    if (supervisorEmployeeId !== null) {
      await this.assertEmployeeExistsInTenant(supervisorEmployeeId, ctx.tenantId);
    }

    const updated = await this.employmentRepo.update(employment.id, ctx.tenantId, {
      supervisorEmployeeId,
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employment',
      entityId: employment.id,
      actionType: 'ASSIST_UPDATE',
      changedByEmployeeId: ctx.employeeId,
      scopeSummary: `employeeId=${employeeId} supervisorEmployeeId=${String(supervisorEmployeeId)}`,
    });
    return updated;
  }

  async uploadPhoto(
    ctx: AuthContext,
    employeeId: number,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    const employee = await this.assertEmployeeExists(employeeId, ctx.tenantId);
    await this.assertCanEditProfile(ctx, employeeId);

    const ext = ALLOWED_PHOTO_TYPES[mimetype];
    if (!ext) {
      throw new UnprocessableEntityException(`Unsupported photo type: ${mimetype}`);
    }

    const oldKey = employee.photoStorageKey;
    const key = `photos/${ctx.tenantId}/${uuidv4()}.${ext}`;
    await this.storageService.save(key, buffer, mimetype);
    await this.employeeRepo.update(employeeId, ctx.tenantId, {
      photoStorageKey: key,
      updatedBy: ctx.userAccountId,
    });

    if (oldKey) {
      await this.storageService.delete(oldKey);
    }

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: employeeId,
      actionType: 'ASSIST_UPDATE',
      changedByEmployeeId: ctx.employeeId,
      scopeSummary: 'photo',
    });
    return key;
  }

  async deletePhoto(ctx: AuthContext, employeeId: number): Promise<void> {
    const employee = await this.assertEmployeeExists(employeeId, ctx.tenantId);
    await this.assertCanEditProfile(ctx, employeeId);

    if (employee.photoStorageKey) {
      await this.storageService.delete(employee.photoStorageKey);
      await this.employeeRepo.update(employeeId, ctx.tenantId, {
        photoStorageKey: null,
        updatedBy: ctx.userAccountId,
      });
      void this.auditService.logEdit({
        tenantId: ctx.tenantId,
        entityType: 'Employee',
        entityId: employeeId,
        actionType: 'ASSIST_UPDATE',
        changedByEmployeeId: ctx.employeeId,
        scopeSummary: 'photo_delete',
      });
    }
  }

  // ── Private helpers ──────────────────────────────────────

  private toPublicView(employee: Employee): EmployeePublicView {
    return {
      id: employee.id,
      tenantId: employee.tenantId,
      fullName: employee.fullName,
      displayName: employee.displayName,
      email: employee.email,
      photoStorageKey: employee.photoStorageKey,
      profileFreeText: employee.profileFreeText,
    };
  }

  private toManagerView(employee: Employee): EmployeeManagerView {
    return {
      id: employee.id,
      tenantId: employee.tenantId,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      displayName: employee.displayName,
      email: employee.email,
      birthDate: employee.birthDate,
      photoStorageKey: employee.photoStorageKey,
      profileFreeText: employee.profileFreeText,
    };
  }

  private toPublicEmployment(employment: Employment, positionMap: Map<number, string>): EmploymentPublicView {
    return {
      id: employment.id,
      tenantId: employment.tenantId,
      employeeId: employment.employeeId,
      organizationId: employment.organizationId,
      positionMasterId: employment.positionMasterId,
      positionName: employment.positionMasterId ? (positionMap.get(employment.positionMasterId) ?? null) : null,
      isPrimaryAssignment: employment.isPrimaryAssignment,
      supervisorEmployeeId: employment.supervisorEmployeeId,
      startDate: employment.startDate,
      endDate: employment.endDate,
      status: employment.status,
    };
  }

  private withPosition(employment: Employment, positionMap: Map<number, string>): EmploymentWithPosition {
    return {
      ...employment,
      positionName: employment.positionMasterId ? (positionMap.get(employment.positionMasterId) ?? null) : null,
    };
  }

  private async resolvePositionNames(employments: Employment[]): Promise<Map<number, string>> {
    const ids = [...new Set(employments.map((e) => e.positionMasterId).filter((id): id is number => id !== null))];
    return this.positionMasterRepo.findNamesByIds(ids);
  }

  private async assertCanEditProfile(ctx: AuthContext, employeeId: number): Promise<void> {
    const canManage = await this.authorizationService.can(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    if (canManage) return;

    const canAssist = await this.authorizationService.can(ctx, Permission.ASSIST_UPDATE_PROFILE, ctx.tenantId);
    if (!canAssist) {
      throw new ForbiddenException();
    }

    const access = await this.scopeResolver.resolveOrgAccess(ctx);
    if (access.kind !== 'ORG_TREE') {
      throw new ForbiddenException();
    }
    await this.assertEmployeeInScope(access, employeeId, ctx);
  }

  private async assertEmployeeInScope(
    access: OrgAccess,
    employeeId: number,
    ctx: AuthContext,
  ): Promise<void> {
    if (access.kind === 'TENANT_ALL') return;

    if (access.kind === 'ORG_TREE') {
      const inScope = await this.employeeRepo.hasActiveEmploymentInOrgs(
        employeeId,
        ctx.tenantId,
        access.orgIds,
      );
      if (!inScope) throw new NotFoundException(`Employee ${employeeId} not found`);
      return;
    }

    // PRIMARY_ORG: can always view self; otherwise check same primary org
    const callerEmployeeId = await this.resolveEmployeeId(ctx);
    if (callerEmployeeId === employeeId) return;

    if (access.orgId === null) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const targetPrimary = await this.employmentRepo.findPrimaryActive(employeeId, ctx.tenantId);
    if (!targetPrimary || targetPrimary.organizationId !== access.orgId) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }
  }

  private async assertEmployeeExists(id: number, tenantId: number): Promise<Employee> {
    const employee = await this.employeeRepo.findById(id, tenantId);
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  private async assertEmployeeExistsInTenant(id: number, tenantId: number): Promise<void> {
    const exists = await this.employeeRepo.existsInTenant(id, tenantId);
    if (!exists) throw new NotFoundException(`Employee ${id} not found in tenant`);
  }

  private async assertOrgExistsInTenant(orgId: number, tenantId: number): Promise<void> {
    const exists = await this.employmentRepo.organizationExistsInTenant(orgId, tenantId);
    if (!exists) throw new NotFoundException(`Organization ${orgId} not found`);
  }

  private async assertEmploymentBelongsToEmployee(
    employmentId: number,
    employeeId: number,
    tenantId: number,
  ): Promise<Employment> {
    const employment = await this.employmentRepo.findById(employmentId, tenantId);
    if (!employment || employment.employeeId !== employeeId) {
      throw new NotFoundException(`Employment ${employmentId} not found`);
    }
    return employment;
  }

  private async resolveEmployeeId(ctx: AuthContext): Promise<number | null> {
    return this.employeeRepo.findEmployeeIdByUserAccount(ctx.userAccountId);
  }
}
