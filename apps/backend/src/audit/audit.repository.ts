import { Injectable } from '@nestjs/common';
import { LoginHistory, EditHistory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
