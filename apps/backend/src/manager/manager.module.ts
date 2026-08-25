import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { ManagerRepository } from './manager.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ManagerController],
  providers: [ManagerService, ManagerRepository],
})
export class ManagerModule {}
