import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CsvService } from './csv.service';
import { CsvController } from './csv.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  providers: [CsvService],
  controllers: [CsvController],
})
export class CsvModule {}
