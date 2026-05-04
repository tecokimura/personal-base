import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthorizationModule), forwardRef(() => AuthModule)],
  providers: [AuditRepository, AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
