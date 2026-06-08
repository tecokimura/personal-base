import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { QualificationRepository } from './qualification.repository';
import { QualificationService } from './qualification.service';
import { QualificationController } from './qualification.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, AuthorizationModule],
  providers: [QualificationRepository, QualificationService],
  controllers: [QualificationController],
})
export class QualificationModule {}
