import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationService } from './authorization.service';
import { ScopeResolverService } from './scope-resolver.service';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AuthorizationService, ScopeResolverService],
  exports: [AuthorizationService, ScopeResolverService],
})
export class AuthorizationModule {}
