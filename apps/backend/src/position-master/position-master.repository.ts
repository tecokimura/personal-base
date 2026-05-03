import { Injectable } from '@nestjs/common';
import { PositionMaster } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PositionMasterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: number, activeOnly = true): Promise<PositionMaster[]> {
    return this.prisma.positionMaster.findMany({
      where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: number, tenantId: number): Promise<PositionMaster | null> {
    return this.prisma.positionMaster.findFirst({ where: { id, tenantId } });
  }

  async create(data: {
    tenantId: number;
    name: string;
    displayOrder: number;
    updatedBy: number;
  }): Promise<PositionMaster> {
    return this.prisma.positionMaster.create({ data: { ...data, isActive: true } });
  }

  async findNamesByIds(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    const positions = await this.prisma.positionMaster.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(positions.map((p) => [p.id, p.name]));
  }

  async update(
    id: number,
    _tenantId: number,
    data: { name?: string; displayOrder?: number; updatedBy: number },
  ): Promise<PositionMaster> {
    return this.prisma.positionMaster.update({ where: { id }, data });
  }

  async deactivate(id: number, _tenantId: number, updatedBy: number): Promise<void> {
    await this.prisma.positionMaster.update({
      where: { id },
      data: { isActive: false, updatedBy },
    });
  }
}
