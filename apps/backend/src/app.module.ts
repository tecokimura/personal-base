import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationModule } from './organization/organization.module';
import { EmployeeModule } from './employee/employee.module';
import { OrgChartModule } from './org-chart/org-chart.module';
import { MediaModule } from './media/media.module';
import { CsvModule } from './csv/csv.module';
import { PositionMasterModule } from './position-master/position-master.module';
import { AuditModule } from './audit/audit.module';
import { WorkHistoryModule } from './work-history/work-history.module';
import { QualificationModule } from './qualification/qualification.module';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule, AdminModule, OrganizationModule, EmployeeModule, OrgChartModule, MediaModule, CsvModule, PositionMasterModule, AuditModule, WorkHistoryModule, QualificationModule],
})
export class AppModule {}
