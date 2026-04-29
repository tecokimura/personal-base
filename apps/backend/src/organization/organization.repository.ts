import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateOrganizationData {
  tenantId: number;
  organizationName: string;
  organizationCode?: string | null;
  parentOrganizationId?: number | null;
  displayOrder: number;
  isActive: boolean;
  updatedBy?: number | null;
}

interface UpdateOrganizationData {
  organizationName?: string;
  organizationCode?: string | null;
  parentOrganizationId?: number | null;
  displayOrder?: number;
  updatedBy?: number | null;
}

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number, tenantId: number): Promise<Organization | null> {
    return this.prisma.organization.findFirst({ where: { id, tenantId } });
  }

  async findAll(tenantId: number, isActive: boolean): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: { tenantId, isActive },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async hasActiveChildren(id: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: { parentOrganizationId: id, tenantId, isActive: true },
    });
    return count > 0;
  }

  async create(data: CreateOrganizationData): Promise<Organization> {
    return this.prisma.organization.create({ data });
  }

  async update(
    id: number,
    tenantId: number,
    data: UpdateOrganizationData,
  ): Promise<Organization> {
    // Verify tenant ownership before update
    await this.prisma.organization.findFirstOrThrow({ where: { id, tenantId } });
    return this.prisma.organization.update({ where: { id }, data });
  }

  async deactivate(id: number, tenantId: number, updatedBy: number): Promise<void> {
    await this.prisma.organization.findFirstOrThrow({ where: { id, tenantId } });
    await this.prisma.organization.update({
      where: { id },
      data: { isActive: false, updatedBy },
    });
  }

  async employeeExistsInTenant(employeeId: number, tenantId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: { id: employeeId, tenantId, isDeleted: false },
    });
    return count > 0;
  }

  // Walk up the ancestor chain from `id` and collect all ancestor IDs (including `id` itself).
  // Used to detect circular reference when re-parenting an organization.
  async findAncestorIds(id: number, tenantId: number): Promise<Set<number>> {
    const visited = new Set<number>();
    let currentId: number | null = id;

    while (currentId !== null) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const org: { parentOrganizationId: number | null } | null =
        await this.prisma.organization.findFirst({
          where: { id: currentId, tenantId },
          select: { parentOrganizationId: true },
        });
      currentId = org?.parentOrganizationId ?? null;
    }

    return visited;
  }
}
