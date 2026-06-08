import { Injectable } from '@nestjs/common';
import { EmployeeAdminSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(employeeId: number, tenantId: number): Promise<EmployeeAdminSection | null> {
    return this.prisma.employeeAdminSection.findUnique({
      where: { employeeId },
    });
  }

  async upsert(
    employeeId: number,
    tenantId: number,
    data: {
      evaluation?: string | null;
      grade?: string | null;
      joiningReason?: string | null;
      employmentCategory?: string | null;
      salaryBand?: string | null;
      specialNotes?: string | null;
      updatedBy?: number;
    },
  ): Promise<EmployeeAdminSection> {
    return this.prisma.employeeAdminSection.upsert({
      where: { employeeId },
      create: { tenantId, employeeId, ...data },
      update: data,
    });
  }
}
