import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class TenantService {
  constructor(private readonly repo: TenantRepository) {}

  async createTenant(tenantCode: string, name: string): Promise<Tenant> {
    const existing = await this.repo.findByCode(tenantCode);
    if (existing !== null) {
      throw new ConflictException(`tenantCode "${tenantCode}" already exists (id=${existing.id})`);
    }
    return this.repo.create({ tenantCode, name });
  }

  async assertExists(tenantId: number): Promise<Tenant> {
    const tenant = await this.repo.findById(tenantId);
    if (tenant === null) {
      throw new NotFoundException(`Tenant ${tenantId} not found. Run create-tenant first.`);
    }
    return tenant;
  }
}
