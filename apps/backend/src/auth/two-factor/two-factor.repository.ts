import { Injectable } from '@nestjs/common';
import { TwoFactorAuth } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAccountId(userAccountId: number): Promise<TwoFactorAuth | null> {
    return this.prisma.twoFactorAuth.findUnique({ where: { userAccountId } });
  }

  async upsert(
    userAccountId: number,
    tenantId: number,
    data: { totpSecret: string },
  ): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.upsert({
      where: { userAccountId },
      update: { totpSecret: data.totpSecret, twoFactorEnabled: false, backupCodeHashes: [] },
      create: {
        userAccountId,
        tenantId,
        totpSecret: data.totpSecret,
        twoFactorEnabled: false,
        backupCodeHashes: [],
      },
    });
  }

  async activate(
    userAccountId: number,
    backupCodeHashes: string[],
  ): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.update({
      where: { userAccountId },
      data: { twoFactorEnabled: true, backupCodeHashes },
    });
  }

  async updateBackupCodes(
    userAccountId: number,
    backupCodeHashes: string[],
  ): Promise<void> {
    await this.prisma.twoFactorAuth.update({
      where: { userAccountId },
      data: { backupCodeHashes },
    });
  }

  async deleteByUserAccountId(userAccountId: number): Promise<void> {
    await this.prisma.twoFactorAuth.deleteMany({ where: { userAccountId } });
  }
}
