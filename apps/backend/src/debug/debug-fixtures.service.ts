import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const DEBUG_TENANT_CODE = 'DEBUG';
const DEBUG_TENANT_NAME = 'デバッグテナント';
const DEBUG_PASSWORD = 'DebugPass1!';

interface RoleUserDef {
  roleType: number;
  loginIdentifier: string;
  fullName: string;
  scopeType: number;
}

const ROLE_USER_DEFS: RoleUserDef[] = [
  { roleType: 1, loginIdentifier: 'debug-hr-admin@debug.local', fullName: 'Debug HR Admin', scopeType: 4 },
  { roleType: 2, loginIdentifier: 'debug-manager@debug.local', fullName: 'Debug Manager', scopeType: 3 },
  { roleType: 3, loginIdentifier: 'debug-org-admin@debug.local', fullName: 'Debug OrgAdmin', scopeType: 2 },
  { roleType: 4, loginIdentifier: 'debug-exec-viewer@debug.local', fullName: 'Debug Exec Viewer', scopeType: 4 },
  { roleType: 5, loginIdentifier: 'debug-employee@debug.local', fullName: 'Debug Employee', scopeType: 1 },
];

@Injectable()
export class DebugFixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureAndGetUserAccountId(roleType: number): Promise<number> {
    const def = ROLE_USER_DEFS.find((u) => u.roleType === roleType);
    if (!def) throw new Error(`Unknown roleType: ${roleType}`);

    const tenant = await this.prisma.tenant.upsert({
      where: { tenantCode: DEBUG_TENANT_CODE },
      create: { tenantCode: DEBUG_TENANT_CODE, name: DEBUG_TENANT_NAME },
      update: {},
    });

    let rootOrg = await this.prisma.organization.findFirst({
      where: { tenantId: tenant.id, organizationCode: 'DEBUGORG' },
    });
    if (!rootOrg) {
      rootOrg = await this.prisma.organization.create({
        data: { tenantId: tenant.id, organizationCode: 'DEBUGORG', organizationName: 'デバッグ組織', isActive: true },
      });
    }

    let deptOrg = await this.prisma.organization.findFirst({
      where: { tenantId: tenant.id, organizationCode: 'DEBUGDEPT' },
    });
    if (!deptOrg) {
      deptOrg = await this.prisma.organization.create({
        data: {
          tenantId: tenant.id,
          organizationCode: 'DEBUGDEPT',
          organizationName: 'デバッグ部門',
          parentOrganizationId: rootOrg.id,
          isActive: true,
        },
      });
    }

    const passwordHash = await bcrypt.hash(DEBUG_PASSWORD, 10);

    const existingAccount = await this.prisma.userAccount.findFirst({
      where: { tenantId: tenant.id, loginIdentifier: def.loginIdentifier },
    });

    let userAccountId: number;
    let employeeId: number;

    if (existingAccount) {
      userAccountId = existingAccount.id;
      employeeId = existingAccount.employeeId;
      await this.prisma.userAccount.update({
        where: { id: existingAccount.id },
        data: { passwordHash, status: 1 },
      });
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { isDeleted: false, deletedAt: null, fullName: def.fullName },
      });
    } else {
      const employee = await this.prisma.employee.create({
        data: { tenantId: tenant.id, fullName: def.fullName },
      });
      const account = await this.prisma.userAccount.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          loginIdentifier: def.loginIdentifier,
          passwordHash,
          status: 1,
        },
      });
      userAccountId = account.id;
      employeeId = employee.id;
    }

    const scopeId =
      def.scopeType === 4 ? 0
      : def.scopeType === 3 || def.scopeType === 2 ? deptOrg.id
      : employeeId;

    const existingRole = await this.prisma.roleAssignment.findFirst({
      where: { tenantId: tenant.id, userAccountId, roleType: def.roleType, scopeType: def.scopeType, scopeId },
    });

    if (existingRole) {
      if (existingRole.effectiveTo !== null) {
        await this.prisma.roleAssignment.update({
          where: { id: existingRole.id },
          data: { effectiveTo: null },
        });
      }
    } else {
      await this.prisma.roleAssignment.deleteMany({ where: { tenantId: tenant.id, userAccountId } });
      await this.prisma.roleAssignment.create({
        data: {
          tenantId: tenant.id,
          userAccountId,
          roleType: def.roleType,
          scopeType: def.scopeType,
          scopeId,
          effectiveFrom: new Date(),
        },
      });
    }

    return userAccountId;
  }
}
