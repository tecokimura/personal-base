import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AdminSectionController } from './admin-section.controller';
import { AdminSectionService } from './admin-section.service';
import { AdminSectionRepository } from './admin-section.repository';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, AuthorizationModule],
  controllers: [AdminSectionController],
  providers: [AdminSectionService, AdminSectionRepository],
})
export class AdminSectionModule {}
