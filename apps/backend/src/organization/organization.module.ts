import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationRepository } from './organization.repository';
import { OrganizationLeaderRepository } from './organization-leader.repository';
import { OrganizationService } from './organization.service';

@Module({
  imports: [AuthorizationModule],
  providers: [OrganizationRepository, OrganizationLeaderRepository, OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
