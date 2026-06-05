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
  supervisorEmployeeId?: number | null;
  startDate: Date;
  endDate?: Date | null;
  status: number;
  updatedBy?: number | null;
}

interface UpdateEmploymentData {
  organizationId?: number;
  positionMasterId?: number | null;
  employmentType?: number;
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
        endDate: null,
        startDate: { lte: startDate },
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async hasActiveEmployments(employeeId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.employment.count({
      where: { employeeId, tenantId, endDate: null },
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
      data: { endDate, updatedBy },
    });
  }

  async markDeleted(id: number, tenantId: number, updatedBy: number | null): Promise<void> {
    await this.prisma.employment.update({
      where: { id },
      data: { status: EMPLOYMENT_STATUS.DELETED, updatedBy },
    });
  }

  async markAllActiveDeleted(employeeId: number, tenantId: number, deletedAt: Date, updatedBy: number | null): Promise<void> {
    await this.prisma.employment.updateMany({
      where: { employeeId, tenantId, endDate: null },
      data: { status: EMPLOYMENT_STATUS.DELETED, endDate: deletedAt, updatedBy },
    });
  }

  async organizationExistsInTenant(organizationId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: { id: organizationId, tenantId, isActive: true },
    });
    return count > 0;
  }
}
