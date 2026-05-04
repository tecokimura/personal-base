import { Injectable } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { AuthContext } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AdminEmployeeRepository } from './admin-employee.repository';
import { AdminRoleAssignmentRepository } from './admin-role-assignment.repository';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminEmployeeRepository: AdminEmployeeRepository,
    private readonly adminRoleAssignmentRepository: AdminRoleAssignmentRepository,
    private readonly auditService: AuditService,
  ) {}

  async assignRole(ctx: AuthContext, dto: AssignRoleDto): Promise<void> {
    const roleAssignment = await this.adminRoleAssignmentRepository.create({
      tenantId: ctx.tenantId,
      userAccountId: dto.targetUserAccountId,
      roleType: dto.roleType,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo:
        dto.effectiveTo != null ? new Date(dto.effectiveTo) : undefined,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'RoleAssignment',
      entityId: roleAssignment.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  async revokeRole(id: number, ctx: AuthContext): Promise<void> {
    await this.adminRoleAssignmentRepository.revoke(id, ctx.tenantId, new Date());
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'RoleAssignment',
      entityId: id,
      actionType: 'REVOKE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  async listDeletedEmployees(tenantId: number): Promise<Employee[]> {
    return this.adminEmployeeRepository.findDeletedByTenant(tenantId);
  }

  async restoreEmployee(id: number, ctx: AuthContext): Promise<void> {
    await this.adminEmployeeRepository.setDeleted(id, ctx.tenantId, false);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: id,
      actionType: 'RESTORE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  async softDeleteEmployee(id: number, ctx: AuthContext): Promise<void> {
    await this.adminEmployeeRepository.setDeleted(id, ctx.tenantId, true);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Employee',
      entityId: id,
      actionType: 'SOFT_DELETE',
      changedByEmployeeId: ctx.employeeId,
    });
  }
}
