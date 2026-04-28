import { Injectable } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { AdminEmployeeRepository } from './admin-employee.repository';
import { AdminRoleAssignmentRepository } from './admin-role-assignment.repository';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminEmployeeRepository: AdminEmployeeRepository,
    private readonly adminRoleAssignmentRepository: AdminRoleAssignmentRepository,
  ) {}

  async assignRole(tenantId: number, dto: AssignRoleDto): Promise<void> {
    await this.adminRoleAssignmentRepository.create({
      tenantId,
      userAccountId: dto.targetUserAccountId,
      roleType: dto.roleType,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo:
        dto.effectiveTo != null ? new Date(dto.effectiveTo) : undefined,
    });
  }

  async revokeRole(id: number, tenantId: number): Promise<void> {
    await this.adminRoleAssignmentRepository.revoke(id, tenantId, new Date());
  }

  async listDeletedEmployees(tenantId: number): Promise<Employee[]> {
    return this.adminEmployeeRepository.findDeletedByTenant(tenantId);
  }

  async restoreEmployee(id: number, tenantId: number): Promise<void> {
    await this.adminEmployeeRepository.setDeleted(id, tenantId, false);
  }

  async softDeleteEmployee(id: number, tenantId: number): Promise<void> {
    await this.adminEmployeeRepository.setDeleted(id, tenantId, true);
  }
}
