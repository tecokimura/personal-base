import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { WorkHistoryRepository } from './work-history.repository';
import { WorkHistoryService } from './work-history.service';
import { WorkHistoryController } from './work-history.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, AuthorizationModule],
  providers: [WorkHistoryRepository, WorkHistoryService],
  controllers: [WorkHistoryController],
})
export class WorkHistoryModule {}
