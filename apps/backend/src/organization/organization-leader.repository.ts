import { Injectable } from '@nestjs/common';
import { OrganizationLeader } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// status: 1=有効, 2=終了済み
const LEADER_STATUS_ACTIVE = 1;
const LEADER_STATUS_TERMINATED = 2;

interface CreateLeaderData {
  tenantId: number;
  organizationId: number;
  employeeId: number;
  leaderType: number;
  isPrimaryLeader: boolean;
  startDate: Date;
  status: number;
  updatedBy?: number | null;
}

@Injectable()
export class OrganizationLeaderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number, tenantId: number): Promise<OrganizationLeader | null> {
    return this.prisma.organizationLeader.findFirst({ where: { id, tenantId } });
  }

  async findByOrganizationId(
    organizationId: number,
    tenantId: number,
    includeTerminated = false,
  ): Promise<OrganizationLeader[]> {
    return this.prisma.organizationLeader.findMany({
      where: {
        organizationId,
        tenantId,
        ...(includeTerminated ? {} : { status: LEADER_STATUS_ACTIVE }),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async hasActiveLeaders(organizationId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.organizationLeader.count({
      where: { organizationId, tenantId, status: LEADER_STATUS_ACTIVE },
    });
    return count > 0;
  }

  async hasActivePrimaryLeader(organizationId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.organizationLeader.count({
      where: { organizationId, tenantId, isPrimaryLeader: true, status: LEADER_STATUS_ACTIVE },
    });
    return count > 0;
  }

  async hasActiveLeaderByType(
    organizationId: number,
    tenantId: number,
    leaderType: number,
  ): Promise<boolean> {
    const count = await this.prisma.organizationLeader.count({
      where: { organizationId, tenantId, leaderType, status: LEADER_STATUS_ACTIVE },
    });
    return count > 0;
  }

  async create(data: CreateLeaderData): Promise<OrganizationLeader> {
    return this.prisma.organizationLeader.create({ data });
  }

  async terminate(
    id: number,
    tenantId: number,
    endDate: Date,
    updatedBy: number,
  ): Promise<void> {
    await this.prisma.organizationLeader.findFirstOrThrow({ where: { id, tenantId } });
    await this.prisma.organizationLeader.update({
      where: { id },
      data: { status: LEADER_STATUS_TERMINATED, endDate, updatedBy },
    });
  }
}
