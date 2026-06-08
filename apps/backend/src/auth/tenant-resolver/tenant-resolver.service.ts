import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Tenant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantResolverService {
  constructor(private readonly prisma: PrismaService) {}

  resolveSlug(req: Request): string | null {
    // Local dev override takes priority
    const envSlug = process.env.TENANT_SLUG;
    if (envSlug) return envSlug;

    // Extract subdomain from Host header
    const host = (req.hostname ?? '').toLowerCase();
    const parts = host.split('.');
    if (parts.length > 2) {
      const sub = parts[0];
      if (sub && sub !== 'www') return sub;
    }

    // Fallback: DEFAULT_TENANT_SLUG for apex domain access
    return process.env.DEFAULT_TENANT_SLUG ?? null;
  }

  async resolveFromRequest(req: Request): Promise<Tenant | null> {
    const slug = this.resolveSlug(req);
    if (!slug) return null;
    return this.prisma.tenant.findUnique({ where: { tenantCode: slug } });
  }
}
