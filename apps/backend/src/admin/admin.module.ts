import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AdminEmployeeRepository } from './admin-employee.repository';
import { AdminRoleAssignmentRepository } from './admin-role-assignment.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, AuthorizationModule],
  providers: [
    AdminEmployeeRepository,
    AdminRoleAssignmentRepository,
    AdminService,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
