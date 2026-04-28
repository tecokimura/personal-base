import { Injectable } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminEmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDeletedByTenant(tenantId: number): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      where: { tenantId, isDeleted: true },
    });
  }

  async setDeleted(
    id: number,
    tenantId: number,
    isDeleted: boolean,
  ): Promise<void> {
    await this.prisma.employee.updateMany({
      where: { id, tenantId },
      data: { isDeleted },
    });
  }
}
