import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationRepository } from './organization.repository';
import { OrganizationLeaderRepository } from './organization-leader.repository';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditModule],
  controllers: [OrganizationController],
  providers: [OrganizationRepository, OrganizationLeaderRepository, OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
