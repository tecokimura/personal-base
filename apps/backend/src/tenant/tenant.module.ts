import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantRepository } from './tenant.repository';
import { TenantService } from './tenant.service';

@Module({
  imports: [PrismaModule],
  providers: [TenantRepository, TenantService],
  exports: [TenantService],
})
export class TenantModule {}
