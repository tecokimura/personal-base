import { Injectable } from '@nestjs/common';
import { Qualification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateQualificationInput {
  tenantId: number;
  employeeId: number;
  name: string;
  acquiredDate: Date;
  note?: string;
  updatedBy?: number;
}

export interface UpdateQualificationInput {
  name?: string;
  acquiredDate?: Date;
  note?: string | null;
  updatedBy?: number;
}

@Injectable()
export class QualificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(employeeId: number, tenantId: number): Promise<Qualification[]> {
    return this.prisma.qualification.findMany({
      where: { employeeId, tenantId },
      orderBy: [{ acquiredDate: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number, tenantId: number): Promise<Qualification | null> {
    return this.prisma.qualification.findFirst({ where: { id, tenantId } });
  }

  async create(input: CreateQualificationInput): Promise<Qualification> {
    return this.prisma.qualification.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        name: input.name,
        acquiredDate: input.acquiredDate,
        note: input.note ?? null,
        updatedBy: input.updatedBy ?? null,
      },
    });
  }

  async update(id: number, tenantId: number, input: UpdateQualificationInput): Promise<Qualification> {
    return this.prisma.qualification.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.acquiredDate !== undefined && { acquiredDate: input.acquiredDate }),
        ...(input.note !== undefined && { note: input.note }),
        ...(input.updatedBy !== undefined && { updatedBy: input.updatedBy }),
      },
    });
  }

  async delete(id: number, tenantId: number): Promise<void> {
    await this.prisma.qualification.deleteMany({ where: { id, tenantId } });
  }
}
