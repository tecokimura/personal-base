import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleType } from '../authorization/constants';

export interface ManagerMemberDto {
  id: number;
  fullName: string;
  employeeNumber: string | null;
  organizationName: string;
}

const EXCLUDED_ROLE_TYPES = [RoleType.HR_ADMIN, RoleType.ORG_ADMIN, RoleType.EXECUTIVE_VIEWER];

@Injectable()
export class ManagerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async collectDescendantOrgIds(rootIds: number[], tenantId: number): Promise<number[]> {
    const allOrgs = await this.prisma.organization.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, parentOrganizationId: true },
    });

    const childrenMap = new Map<number, number[]>();
    for (const org of allOrgs) {
      if (org.parentOrganizationId !== null) {
        const siblings = childrenMap.get(org.parentOrganizationId) ?? [];
        siblings.push(org.id);
        childrenMap.set(org.parentOrganizationId, siblings);
      }
    }

    const result = new Set<number>();
    const queue = [...rootIds];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (result.has(id)) continue;
      result.add(id);
      const children = childrenMap.get(id) ?? [];
      queue.push(...children);
    }
    return [...result];
  }

  async findEmployeesInOrgs(tenantId: number, orgIds: number[]): Promise<ManagerMemberDto[]> {
    if (orgIds.length === 0) return [];

    const employments = await this.prisma.employment.findMany({
      where: {
        tenantId,
        organizationId: { in: orgIds },
        endDate: null,
        employee: { isDeleted: false },
      },
      select: {
        employeeId: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
          },
        },
        organization: {
          select: { organizationName: true },
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    // Deduplicate by employeeId, keep first occurrence
    const seen = new Set<number>();
    const result: ManagerMemberDto[] = [];
    for (const emp of employments) {
      if (seen.has(emp.employeeId)) continue;
      seen.add(emp.employeeId);
      result.push({
        id: emp.employee.id,
        fullName: emp.employee.fullName,
        employeeNumber: emp.employee.employeeNumber,
        organizationName: emp.organization.organizationName,
      });
    }
    return result;
  }

  async findEmployeeIdsWithExcludedRoles(
    tenantId: number,
    employeeIds: number[],
  ): Promise<Set<number>> {
    if (employeeIds.length === 0) return new Set();

    const accounts = await this.prisma.userAccount.findMany({
      where: { tenantId, employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true },
    });
    if (accounts.length === 0) return new Set();

    const accountIds = accounts.map((a) => a.id);
    const accountToEmployee = new Map(accounts.map((a) => [a.id, a.employeeId]));

    const now = new Date();
    const excluded = await this.prisma.roleAssignment.findMany({
      where: {
        userAccountId: { in: accountIds },
        roleType: { in: EXCLUDED_ROLE_TYPES },
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      select: { userAccountId: true },
      distinct: ['userAccountId'],
    });

    const result = new Set<number>();
    for (const row of excluded) {
      const empId = accountToEmployee.get(row.userAccountId);
      if (empId !== undefined) result.add(empId);
    }
    return result;
  }
}
