import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebugController } from './debug.controller';
import { DebugFixturesService } from './debug-fixtures.service';

@Module({
  imports: [AuthModule],
  controllers: [DebugController],
  providers: [DebugFixturesService],
})
export class DebugModule {}
