import { Injectable } from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_FILTER = { isDeleted: false };

interface CreateEmployeeData {
  tenantId: number;
  employeeNumber?: string | null;
  fullName: string;
  displayName?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  photoStorageKey?: string | null;
  profileFreeText?: string | null;
  updatedBy?: number | null;
}

interface UpdateEmployeeData {
  fullName?: string;
  displayName?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  photoStorageKey?: string | null;
  profileFreeText?: string | null;
  updatedBy?: number | null;
}

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number, tenantId: number, includeDeleted = false): Promise<Employee | null> {
    return this.prisma.employee.findFirst({
      where: { id, tenantId, ...(includeDeleted ? {} : ACTIVE_FILTER) },
    });
  }

  async findAll(tenantId: number): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      where: { tenantId, ...ACTIVE_FILTER },
      orderBy: { id: 'asc' },
    });
  }

  /** Returns active employees who have at least one active Employment in the given org IDs. */
  async findByOrgIds(tenantId: number, orgIds: ReadonlySet<number>): Promise<Employee[]> {
    const ids = [...orgIds];
    if (ids.length === 0) return [];
    const employments = await this.prisma.employment.findMany({
      where: { tenantId, organizationId: { in: ids }, status: 1 },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    const employeeIds = employments.map((e) => e.employeeId);
    if (employeeIds.length === 0) return [];
    return this.prisma.employee.findMany({
      where: { id: { in: employeeIds }, tenantId, ...ACTIVE_FILTER },
      orderBy: { id: 'asc' },
    });
  }

  /** Returns active employees with active primary employment in orgId, plus selfEmployeeId. */
  async findBySamePrimaryOrg(
    tenantId: number,
    orgId: number,
    selfEmployeeId: number,
  ): Promise<Employee[]> {
    const employments = await this.prisma.employment.findMany({
      where: { tenantId, organizationId: orgId, status: 1 },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    const ids = new Set(employments.map((e) => e.employeeId));
    ids.add(selfEmployeeId); // always include self
    return this.prisma.employee.findMany({
      where: { id: { in: [...ids] }, tenantId, ...ACTIVE_FILTER },
      orderBy: { id: 'asc' },
    });
  }

  async findDeleted(tenantId: number): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      where: { tenantId, isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /** Returns deleted employees who had a DELETED (status=9) employment in any of the given orgs. */
  async findDeletedByOrgIds(tenantId: number, orgIds: ReadonlySet<number>): Promise<Employee[]> {
    const ids = [...orgIds];
    if (ids.length === 0) return [];
    const employments = await this.prisma.employment.findMany({
      where: { tenantId, organizationId: { in: ids }, status: 9 },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    const employeeIds = employments.map((e) => e.employeeId);
    if (employeeIds.length === 0) return [];
    return this.prisma.employee.findMany({
      where: { id: { in: employeeIds }, tenantId, isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async hasDeletedEmploymentInOrgs(
    employeeId: number,
    tenantId: number,
    orgIds: ReadonlySet<number>,
  ): Promise<boolean> {
    const ids = [...orgIds];
    if (ids.length === 0) return false;
    const count = await this.prisma.employment.count({
      where: { employeeId, tenantId, organizationId: { in: ids }, status: 9 },
    });
    return count > 0;
  }

  async employeeNumberExists(tenantId: number, employeeNumber: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        tenantId,
        employeeNumber,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async create(data: CreateEmployeeData): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async update(id: number, tenantId: number, data: UpdateEmployeeData): Promise<Employee> {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async softDelete(id: number, tenantId: number, deletedAt: Date, updatedBy: number | null): Promise<void> {
    await this.prisma.employee.update({
      where: { id },
      data: { isDeleted: true, deletedAt, updatedBy },
    });
  }

  async restore(id: number, tenantId: number, updatedBy: number | null): Promise<void> {
    await this.prisma.employee.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, updatedBy },
    });
  }

  async existsInTenant(id: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({ where: { id, tenantId } });
    return count > 0;
  }

  async generatePlaceholderNumber(tenantId: number): Promise<string> {
    const count = await this.prisma.employee.count({ where: { tenantId } });
    return `TEMP${String(count + 1).padStart(6, '0')}`;
  }

  async hasActiveEmploymentInOrgs(
    employeeId: number,
    tenantId: number,
    orgIds: ReadonlySet<number>,
  ): Promise<boolean> {
    const ids = [...orgIds];
    if (ids.length === 0) return false;
    const count = await this.prisma.employment.count({
      where: { employeeId, tenantId, organizationId: { in: ids }, status: 1 },
    });
    return count > 0;
  }

  async findEmployeeIdByUserAccount(userAccountId: number): Promise<number | null> {
    const account = await this.prisma.userAccount.findFirst({
      where: { id: userAccountId },
      select: { employeeId: true },
    });
    return account?.employeeId ?? null;
  }
}
