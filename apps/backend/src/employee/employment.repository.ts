import { Injectable } from '@nestjs/common';
import { Employment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// status: 1=在職, 2=休職, 3=退職, 9=削除
export const EMPLOYMENT_STATUS = {
  ACTIVE: 1,
  LEAVE: 2,
  RESIGNED: 3,
  DELETED: 9,
} as const;

interface CreateEmploymentData {
  tenantId: number;
  employeeId: number;
  organizationId: number;
  positionMasterId?: number | null;
  employmentType: number;
  isPrimaryAssignment: boolean;
  supervisorEmployeeId?: number | null;
  startDate: Date;
  status: number;
  updatedBy?: number | null;
}

interface UpdateEmploymentData {
  organizationId?: number;
  positionMasterId?: number | null;
  employmentType?: number;
  isPrimaryAssignment?: boolean;
  supervisorEmployeeId?: number | null;
  startDate?: Date;
  endDate?: Date | null;
  status?: number;
  updatedBy?: number | null;
}

@Injectable()
export class EmploymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number, tenantId: number): Promise<Employment | null> {
    return this.prisma.employment.findFirst({ where: { id, tenantId } });
  }

  async findByEmployeeId(employeeId: number, tenantId: number): Promise<Employment[]> {
    return this.prisma.employment.findMany({
      where: { employeeId, tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findPrimaryActive(employeeId: number, tenantId: number): Promise<Employment | null> {
    return this.prisma.employment.findFirst({
      where: { employeeId, tenantId, isPrimaryAssignment: true, status: EMPLOYMENT_STATUS.ACTIVE },
    });
  }

  async hasActivePrimaryAssignment(employeeId: number, tenantId: number, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.employment.count({
      where: {
        employeeId,
        tenantId,
        isPrimaryAssignment: true,
        status: EMPLOYMENT_STATUS.ACTIVE,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async hasOverlappingActiveEmployment(
    employeeId: number,
    organizationId: number,
    tenantId: number,
    startDate: Date,
    excludeId?: number,
  ): Promise<boolean> {
    const count = await this.prisma.employment.count({
      where: {
        employeeId,
        organizationId,
        tenantId,
        status: EMPLOYMENT_STATUS.ACTIVE,
        startDate: { lte: startDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async hasActiveEmployments(employeeId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.employment.count({
      where: { employeeId, tenantId, status: EMPLOYMENT_STATUS.ACTIVE },
    });
    return count > 0;
  }

  async create(data: CreateEmploymentData): Promise<Employment> {
    return this.prisma.employment.create({ data });
  }

  async update(id: number, tenantId: number, data: UpdateEmploymentData): Promise<Employment> {
    return this.prisma.employment.update({ where: { id }, data });
  }

  async terminate(id: number, tenantId: number, endDate: Date, updatedBy: number | null): Promise<void> {
    await this.prisma.employment.update({
      where: { id },
      data: { status: EMPLOYMENT_STATUS.RESIGNED, endDate, updatedBy },
    });
  }

  async markDeleted(id: number, tenantId: number, updatedBy: number | null): Promise<void> {
    await this.prisma.employment.update({
      where: { id },
      data: { status: EMPLOYMENT_STATUS.DELETED, updatedBy },
    });
  }

  async markAllActiveDeleted(employeeId: number, tenantId: number, updatedBy: number | null): Promise<void> {
    await this.prisma.employment.updateMany({
      where: { employeeId, tenantId, status: EMPLOYMENT_STATUS.ACTIVE },
      data: { status: EMPLOYMENT_STATUS.DELETED, updatedBy },
    });
  }

  async organizationExistsInTenant(organizationId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: { id: organizationId, tenantId, isActive: true },
    });
    return count > 0;
  }
}
