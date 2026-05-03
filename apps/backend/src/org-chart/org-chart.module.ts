import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrgChartRepository } from './org-chart.repository';
import { OrgChartService } from './org-chart.service';
import { OrgChartController } from './org-chart.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  providers: [OrgChartRepository, OrgChartService],
  controllers: [OrgChartController],
})
export class OrgChartModule {}
