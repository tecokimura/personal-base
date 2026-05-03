import { Injectable } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async findByCode(tenantCode: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { tenantCode } });
  }

  async create(data: { tenantCode: string; name: string }): Promise<Tenant> {
    return this.prisma.tenant.create({ data });
  }
}
