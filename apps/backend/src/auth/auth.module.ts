import { Module } from '@nestjs/common';
import { UserAccountRepository } from './user-account/user-account.repository';
import { UserAccountService } from './user-account/user-account.service';
import { SessionRepository } from './session/session.repository';
import { SessionService } from './session/session.service';
import { RoleAssignmentRepository } from './role-assignment/role-assignment.repository';
import { RoleAssignmentService } from './role-assignment/role-assignment.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionGuard } from './guards/session.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [
    UserAccountRepository,
    UserAccountService,
    SessionRepository,
    SessionService,
    RoleAssignmentRepository,
    RoleAssignmentService,
    AuthService,
    SessionGuard,
  ],
  exports: [
    UserAccountService,
    SessionService,
    RoleAssignmentService,
    AuthService,
    SessionGuard,
  ],
})
export class AuthModule {}
