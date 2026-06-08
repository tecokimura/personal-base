import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSessionInput {
  tenantId: number;
  userAccountId: number;
  sessionTokenHash: string;
  expiresAt: Date;
  twoFactorVerified?: boolean;
}

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<Session> {
    return this.prisma.session.create({ data: input });
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
    });
  }

  async revoke(id: number, revokedAt: Date): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { revokedAt },
    });
  }

  async revokeAllByUserAccountId(
    userAccountId: number,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userAccountId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async findValidByTokenHash(
    tokenHash: string,
    now: Date = new Date(),
  ): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        sessionTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
  }

  async markTwoFactorVerified(tokenHash: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { sessionTokenHash: tokenHash },
      data: { twoFactorVerified: true },
    });
  }
}
