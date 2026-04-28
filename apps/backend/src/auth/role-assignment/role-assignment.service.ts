import { Injectable } from '@nestjs/common';
import { RoleAssignment } from '@prisma/client';
import { RoleAssignmentRepository } from './role-assignment.repository';

@Injectable()
export class RoleAssignmentService {
  constructor(
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
  ) {}

  async getActiveRoles(
    userAccountId: number,
    at?: Date,
  ): Promise<RoleAssignment[]> {
    return this.roleAssignmentRepository.findActiveByUserAccountId(
      userAccountId,
      at,
    );
  }
}
