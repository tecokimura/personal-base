import { Module, forwardRef } from '@nestjs/common';
import { UserAccountRepository } from './user-account/user-account.repository';
import { UserAccountService } from './user-account/user-account.service';
import { SessionRepository } from './session/session.repository';
import { SessionService } from './session/session.service';
import { RoleAssignmentRepository } from './role-assignment/role-assignment.repository';
import { RoleAssignmentService } from './role-assignment/role-assignment.service';
import { TwoFactorRepository } from './two-factor/two-factor.repository';
import { TwoFactorService } from './two-factor/two-factor.service';
import { TenantResolverService } from './tenant-resolver/tenant-resolver.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionGuard } from './guards/session.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [AuthController],
  providers: [
    UserAccountRepository,
    UserAccountService,
    SessionRepository,
    SessionService,
    RoleAssignmentRepository,
    RoleAssignmentService,
    TwoFactorRepository,
    TwoFactorService,
    TenantResolverService,
    AuthService,
    SessionGuard,
  ],
  exports: [
    UserAccountService,
    SessionService,
    RoleAssignmentService,
    TwoFactorService,
    TenantResolverService,
    AuthService,
    SessionGuard,
  ],
})
export class AuthModule {}
