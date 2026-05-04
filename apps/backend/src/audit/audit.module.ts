import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  providers: [AuditRepository, AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
