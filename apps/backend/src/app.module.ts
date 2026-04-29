import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule, AdminModule, OrganizationModule],
})
export class AppModule {}
