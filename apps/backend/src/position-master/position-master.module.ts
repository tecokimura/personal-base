import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PositionMasterRepository } from './position-master.repository';
import { PositionMasterService } from './position-master.service';
import { PositionMasterController } from './position-master.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [PositionMasterController],
  providers: [PositionMasterRepository, PositionMasterService],
  exports: [PositionMasterRepository],
})
export class PositionMasterModule {}
