import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Flat row returned for a single organization with aggregated data
export interface OrgRow {
  id: number;
  tenantId: number;
  organizationName: string;
  organizationCode: string | null;
  parentOrganizationId: number | null;
  displayOrder: number;
}

export interface LeaderRow {
  id: number;
  organizationId: number;
  employeeId: number;
  leaderType: number;
  displayName: string | null;
  fullName: string;
}

export interface EmploymentRow {
  id: number;
  organizationId: number;
  employeeId: number;
  supervisorEmployeeId: number | null;
  positionMasterId: number | null;
  employeeNumber: string | null;
  displayName: string | null;
  fullName: string;
  photoStorageKey: string | null;
}

// status codes
const ORG_LEADER_ACTIVE = 1;

@Injectable()
export class OrgChartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveOrganizations(tenantId: number): Promise<OrgRow[]> {
    return this.prisma.organization.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        tenantId: true,
        organizationName: true,
        organizationCode: true,
        parentOrganizationId: true,
        displayOrder: true,
      },
    });
  }

  async findActiveLeaders(tenantId: number): Promise<LeaderRow[]> {
    const rows = await this.prisma.organizationLeader.findMany({
      where: { tenantId, status: ORG_LEADER_ACTIVE },
      orderBy: [{ leaderType: 'asc' }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        leaderType: true,
        employee: {
          select: { displayName: true, fullName: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      employeeId: r.employeeId,
      leaderType: r.leaderType,
      displayName: r.employee.displayName,
      fullName: r.employee.fullName,
    }));
  }

  async findActiveLeadersByOrg(organizationId: number, tenantId: number): Promise<LeaderRow[]> {
    const rows = await this.prisma.organizationLeader.findMany({
      where: { organizationId, tenantId, status: ORG_LEADER_ACTIVE },
      orderBy: [{ leaderType: 'asc' }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        leaderType: true,
        employee: {
          select: { displayName: true, fullName: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      employeeId: r.employeeId,
      leaderType: r.leaderType,
      displayName: r.employee.displayName,
      fullName: r.employee.fullName,
    }));
  }

  async countActiveEmploymentsByOrg(tenantId: number): Promise<Map<number, number>> {
    const counts = await this.prisma.employment.groupBy({
      by: ['organizationId'],
      where: { tenantId, endDate: null },
      _count: { id: true },
    });

    return new Map(counts.map((c) => [c.organizationId, c._count.id]));
  }

  async findActiveEmploymentsByOrg(
    organizationId: number,
    tenantId: number,
  ): Promise<EmploymentRow[]> {
    const rows = await this.prisma.employment.findMany({
      where: { organizationId, tenantId, endDate: null },
      orderBy: [{ id: 'asc' }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        supervisorEmployeeId: true,
        positionMasterId: true,
        employee: {
          select: {
            employeeNumber: true,
            displayName: true,
            fullName: true,
            photoStorageKey: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      employeeId: r.employeeId,
      supervisorEmployeeId: r.supervisorEmployeeId,
      positionMasterId: r.positionMasterId,
      employeeNumber: r.employee.employeeNumber,
      displayName: r.employee.displayName,
      fullName: r.employee.fullName,
      photoStorageKey: r.employee.photoStorageKey,
    }));
  }

  async findEmployeeDisplayNameById(
    employeeId: number,
    tenantId: number,
  ): Promise<string | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, isDeleted: false },
      select: { displayName: true, fullName: true },
    });
    if (!employee) return null;
    return employee.displayName ?? employee.fullName;
  }

  async findPositionMastersByTenant(tenantId: number): Promise<Map<number, string>> {
    const positions = await this.prisma.positionMaster.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });
    return new Map(positions.map((p) => [p.id, p.name]));
  }

  async findPrimaryOrgNameForEmployee(
    employeeId: number,
    tenantId: number,
  ): Promise<string | null> {
    const primary = await this.prisma.employment.findFirst({
      where: { employeeId, tenantId, endDate: null },
      orderBy: { id: 'asc' },
      select: { organization: { select: { organizationName: true } } },
    });
    return primary?.organization.organizationName ?? null;
  }
}
