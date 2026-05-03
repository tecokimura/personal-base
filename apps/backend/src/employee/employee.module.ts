import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { StorageModule } from '../storage/storage.module';
import { PositionMasterModule } from '../position-master/position-master.module';
import { EmployeeRepository } from './employee.repository';
import { EmploymentRepository } from './employment.repository';
import { EmployeeDirectoryService } from './employee-directory.service';
import { EmployeeController } from './employee.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule, StorageModule, PositionMasterModule],
  providers: [EmployeeRepository, EmploymentRepository, EmployeeDirectoryService],
  controllers: [EmployeeController],
})
export class EmployeeModule {}
