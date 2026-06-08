import { Injectable, NotFoundException } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { AuthContext } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from '../auth/two-factor/two-factor.service';
import { AdminEmployeeRepository } from './admin-employee.repository';
import { AdminRoleAssignmentRepository } from './admin-role-assignment.repository';
import { AssignRoleDto } from './dto/assign-role.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminEmployeeRepository: AdminEmployeeRepository,
    private readonly adminRoleAssignmentRepository: AdminRoleAssignmentRepository,
    private readonly auditService: AuditService,
    private readonly twoFactorService: TwoFactorService,
    private readonly prisma: PrismaService,
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

  async getTwoFactorPolicy(tenantId: number): Promise<number> {
    return this.twoFactorService.getTenantPolicy(tenantId);
  }

  async setTwoFactorPolicy(tenantId: number, policy: number): Promise<void> {
    await this.twoFactorService.setTenantPolicy(tenantId, policy);
  }

  async resetTwoFactorByEmployeeId(employeeId: number, tenantId: number): Promise<void> {
    const userAccount = await this.prisma.userAccount.findFirst({
      where: { employeeId, tenantId },
    });
    if (!userAccount) {
      throw new NotFoundException('User account not found');
    }
    await this.twoFactorService.reset2FA(userAccount.id);
  }
}
