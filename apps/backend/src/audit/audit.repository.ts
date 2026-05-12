import { Injectable } from '@nestjs/common';
import { LoginHistory, EditHistory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type EditHistoryWithTarget = EditHistory & { resolvedEmployeeId: number | null };

export interface CreateLoginHistoryInput {
  tenantId: number;
  userAccountId: number;
  employeeId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateEditHistoryInput {
  tenantId: number;
  entityType: string;
  entityId: number;
  actionType: string;
  changedByEmployeeId: number;
  scopeSummary?: string;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createLoginHistory(data: CreateLoginHistoryInput): Promise<void> {
    await this.prisma.loginHistory.create({ data });
  }

  async createEditHistory(data: CreateEditHistoryInput): Promise<void> {
    await this.prisma.editHistory.create({ data });
  }

  async findLoginHistoryByTenant(tenantId: number): Promise<LoginHistory[]> {
    return this.prisma.loginHistory.findMany({
      where: { tenantId },
      orderBy: { loggedInAt: 'desc' },
      take: 200,
    });
  }

  async findEditHistoryByTenant(tenantId: number): Promise<EditHistory[]> {
    return this.prisma.editHistory.findMany({
      where: { tenantId },
      orderBy: { changedAt: 'desc' },
      take: 200,
    });
  }

  async findEditHistoryWithTargetByTenant(tenantId: number): Promise<EditHistoryWithTarget[]> {
    const rows = await this.prisma.editHistory.findMany({
      where: { tenantId },
      orderBy: { changedAt: 'desc' },
      take: 200,
    });

    const whIds = rows.filter((r) => r.entityType === 'WorkHistory').map((r) => r.entityId);
    const empIds = rows.filter((r) => r.entityType === 'Employment').map((r) => r.entityId);

    const [whs, emps] = await Promise.all([
      whIds.length > 0
        ? this.prisma.workHistory.findMany({ where: { id: { in: whIds } }, select: { id: true, employeeId: true } })
        : [],
      empIds.length > 0
        ? this.prisma.employment.findMany({ where: { id: { in: empIds } }, select: { id: true, employeeId: true } })
        : [],
    ]);

    const whMap = new Map(whs.map((w) => [w.id, w.employeeId]));
    const empMap = new Map(emps.map((e) => [e.id, e.employeeId]));

    return rows.map((r) => {
      let resolvedEmployeeId: number | null = null;
      if (r.entityType === 'Employee') resolvedEmployeeId = r.entityId;
      else if (r.entityType === 'WorkHistory') resolvedEmployeeId = whMap.get(r.entityId) ?? null;
      else if (r.entityType === 'Employment') resolvedEmployeeId = empMap.get(r.entityId) ?? null;
      return { ...r, resolvedEmployeeId };
    });
  }
}
