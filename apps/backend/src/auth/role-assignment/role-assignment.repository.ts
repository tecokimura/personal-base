import { Injectable } from '@nestjs/common';
import { RoleAssignment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserAccountId(
    userAccountId: number,
    at: Date = new Date(),
  ): Promise<RoleAssignment[]> {
    return this.prisma.roleAssignment.findMany({
      where: {
        userAccountId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
    });
  }
}
