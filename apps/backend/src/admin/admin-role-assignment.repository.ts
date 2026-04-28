import { Injectable } from '@nestjs/common';
import { RoleAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateRoleAssignmentInput {
  tenantId: number;
  userAccountId: number;
  roleType: number;
  scopeType: number;
  scopeId: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

@Injectable()
export class AdminRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRoleAssignmentInput): Promise<RoleAssignment> {
    return this.prisma.roleAssignment.create({
      data: {
        ...input,
        effectiveTo: input.effectiveTo ?? null,
      },
    });
  }

  async revoke(id: number, tenantId: number, effectiveTo: Date): Promise<void> {
    await this.prisma.roleAssignment.updateMany({
      where: { id, tenantId },
      data: { effectiveTo },
    });
  }
}
