import { Injectable } from '@nestjs/common';
import { WorkHistory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateWorkHistoryInput {
  tenantId: number;
  employeeId: number;
  yearMonthFrom: string;
  yearMonthTo?: string;
  isCurrent: boolean;
  workSummary: string;
  toolsUsed?: string;
  roleName?: string;
  teamSize?: number;
  projectCode?: string;
  updatedBy?: number;
}

export interface UpdateWorkHistoryInput {
  yearMonthFrom?: string;
  yearMonthTo?: string | null;
  isCurrent?: boolean;
  workSummary?: string;
  toolsUsed?: string;
  roleName?: string;
  teamSize?: number;
  projectCode?: string;
  updatedBy?: number;
}

@Injectable()
export class WorkHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(employeeId: number, tenantId: number): Promise<WorkHistory[]> {
    return this.prisma.workHistory.findMany({
      where: { employeeId, tenantId },
      orderBy: [{ yearMonthFrom: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number, tenantId: number): Promise<WorkHistory | null> {
    return this.prisma.workHistory.findFirst({ where: { id, tenantId } });
  }

  async create(input: CreateWorkHistoryInput): Promise<WorkHistory> {
    return this.prisma.workHistory.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        yearMonthFrom: input.yearMonthFrom,
        yearMonthTo: input.yearMonthTo ?? null,
        isCurrent: input.isCurrent,
        workSummary: input.workSummary,
        toolsUsed: input.toolsUsed ?? null,
        roleName: input.roleName ?? null,
        teamSize: input.teamSize ?? null,
        projectCode: input.projectCode ?? null,
        updatedBy: input.updatedBy ?? null,
      },
    });
  }

  async update(id: number, tenantId: number, input: UpdateWorkHistoryInput): Promise<WorkHistory> {
    return this.prisma.workHistory.update({
      where: { id },
      data: {
        ...(input.yearMonthFrom !== undefined && { yearMonthFrom: input.yearMonthFrom }),
        ...(input.yearMonthTo !== undefined && { yearMonthTo: input.yearMonthTo }),
        ...(input.isCurrent !== undefined && { isCurrent: input.isCurrent }),
        ...(input.workSummary !== undefined && { workSummary: input.workSummary }),
        ...(input.toolsUsed !== undefined && { toolsUsed: input.toolsUsed }),
        ...(input.roleName !== undefined && { roleName: input.roleName }),
        ...(input.teamSize !== undefined && { teamSize: input.teamSize }),
        ...(input.projectCode !== undefined && { projectCode: input.projectCode }),
        ...(input.updatedBy !== undefined && { updatedBy: input.updatedBy }),
      },
    });
  }

  async delete(id: number, tenantId: number): Promise<void> {
    await this.prisma.workHistory.deleteMany({ where: { id, tenantId } });
  }
}
