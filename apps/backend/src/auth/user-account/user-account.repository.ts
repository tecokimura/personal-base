import { Injectable } from '@nestjs/common';
import { UserAccount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<UserAccount | null> {
    return this.prisma.userAccount.findUnique({ where: { id } });
  }

  async findByTenantAndLoginIdentifier(
    tenantId: number,
    loginIdentifier: string,
  ): Promise<UserAccount | null> {
    return this.prisma.userAccount.findUnique({
      where: { tenantId_loginIdentifier: { tenantId, loginIdentifier } },
    });
  }

  async updateLastLoggedInAt(id: number, lastLoggedInAt: Date): Promise<void> {
    await this.prisma.userAccount.update({
      where: { id },
      data: { lastLoggedInAt },
    });
  }
}
