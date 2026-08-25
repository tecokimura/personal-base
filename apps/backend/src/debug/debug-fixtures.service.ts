import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const DEBUG_TENANT_CODE = 'DEBUG';
const DEBUG_TENANT_NAME = 'デバッグテナント';
const DEBUG_PASSWORD = 'demo';

interface RoleUserDef {
  roleType: number;
  loginIdentifier: string;
  fullName: string;
  scopeType: number;
}

const ROLE_USER_DEFS: RoleUserDef[] = [
  { roleType: 1, loginIdentifier: 'admin@example.com', fullName: 'デモ HR Admin', scopeType: 4 },
  { roleType: 2, loginIdentifier: 'manager@example.com', fullName: 'デモ Manager', scopeType: 3 },
  { roleType: 3, loginIdentifier: 'org-admin@example.com', fullName: 'デモ Org Admin', scopeType: 2 },
  { roleType: 4, loginIdentifier: 'exec-viewer@example.com', fullName: 'デモ Exec Viewer', scopeType: 4 },
  { roleType: 5, loginIdentifier: 'employee@example.com', fullName: 'デモ Employee', scopeType: 1 },
];

interface ExtraEmployeeDef {
  number: string;
  fullName: string;
  displayName: string;
  orgCode: string;
  /** 兼務先組織コード（複数組織所属） */
  secondOrgCode?: string;
}

const EXTRA_EMPLOYEE_DEFS: ExtraEmployeeDef[] = [
  { number: 'DEBUG-EMP-001', fullName: '田中 一郎', displayName: 'Tanaka Ichiro', orgCode: 'DEBUGDEPT' },
  { number: 'DEBUG-EMP-002', fullName: '鈴木 花子', displayName: 'Suzuki Hanako', orgCode: 'DEBUGDEPT' },
  { number: 'DEBUG-EMP-003', fullName: '佐藤 次郎', displayName: 'Sato Jiro', orgCode: 'DEBUGDEPT' },
  { number: 'DEBUG-EMP-004', fullName: '高橋 三郎', displayName: 'Takahashi Saburo', orgCode: 'DEBUGTEAM' },
  { number: 'DEBUG-EMP-005', fullName: '伊藤 四郎', displayName: 'Ito Shiro', orgCode: 'DEBUGTEAM' },
  { number: 'DEBUG-EMP-006', fullName: '渡辺 五郎', displayName: 'Watanabe Goro', orgCode: 'DEBUGTEAM' },
  { number: 'DEBUG-EMP-007', fullName: '山本 六子', displayName: 'Yamamoto Rokuko', orgCode: 'DEBUGDEPT2' },
  { number: 'DEBUG-EMP-008', fullName: '中村 七海', displayName: 'Nakamura Nanami', orgCode: 'DEBUGDEPT2' },
  // 兼務社員: DEBUGDEPT と DEBUGDEPT2 の両方に所属
  { number: 'DEBUG-EMP-009', fullName: '小林 八重', displayName: 'Kobayashi Yae', orgCode: 'DEBUGDEPT', secondOrgCode: 'DEBUGDEPT2' },
];

interface SeedResult {
  roleUsersCreated: string[];
  extraEmployeesCreated: string[];
}

@Injectable()
export class DebugFixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureAndGetUserAccountId(roleType: number): Promise<number> {
    const def = ROLE_USER_DEFS.find((u) => u.roleType === roleType);
    if (!def) throw new Error(`Unknown roleType: ${roleType}`);

    const { tenant, deptOrg } = await this.ensureBaseOrgs();
    return this.upsertRoleUser(def, tenant.id, deptOrg.id);
  }

  async seedAllFixtures(): Promise<SeedResult> {
    const { tenant, orgIdByCode } = await this.ensureAllOrgs();
    const deptOrgId = orgIdByCode.get('DEBUGDEPT')!;

    const roleUsersCreated: string[] = [];
    for (const def of ROLE_USER_DEFS) {
      await this.upsertRoleUser(def, tenant.id, deptOrgId);
      roleUsersCreated.push(def.loginIdentifier);
    }

    const extraEmployeesCreated: string[] = [];
    for (const def of EXTRA_EMPLOYEE_DEFS) {
      await this.upsertExtraEmployee(def, tenant.id, orgIdByCode);
      extraEmployeesCreated.push(def.number);
    }

    return { roleUsersCreated, extraEmployeesCreated };
  }

  private async ensureBaseOrgs() {
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

    return { tenant, rootOrg, deptOrg };
  }

  private async ensureAllOrgs() {
    const { tenant, rootOrg, deptOrg } = await this.ensureBaseOrgs();

    const orgIdByCode = new Map<string, number>();
    orgIdByCode.set('DEBUGORG', rootOrg.id);
    orgIdByCode.set('DEBUGDEPT', deptOrg.id);

    // DEBUGTEAM: DEBUGDEPTの配下チーム（MANAGERは見えるがORG_ADMINは見えない）
    const teamOrg = await this.upsertOrg(tenant.id, 'DEBUGTEAM', 'デバッグチーム', deptOrg.id);
    orgIdByCode.set('DEBUGTEAM', teamOrg.id);

    // DEBUGDEPT2: DEBUGORGの第2部門（MANAGERもORG_ADMINも管轄外）
    const dept2Org = await this.upsertOrg(tenant.id, 'DEBUGDEPT2', 'デバッグ第2部門', rootOrg.id);
    orgIdByCode.set('DEBUGDEPT2', dept2Org.id);

    return { tenant, orgIdByCode };
  }

  private async upsertOrg(tenantId: number, code: string, name: string, parentId: number) {
    const existing = await this.prisma.organization.findFirst({
      where: { tenantId, organizationCode: code },
    });
    if (existing) return existing;
    return this.prisma.organization.create({
      data: { tenantId, organizationCode: code, organizationName: name, parentOrganizationId: parentId, isActive: true },
    });
  }

  private async upsertRoleUser(def: RoleUserDef, tenantId: number, deptOrgId: number): Promise<number> {
    const passwordHash = await bcrypt.hash(DEBUG_PASSWORD, 10);

    const existingAccount = await this.prisma.userAccount.findFirst({
      where: { tenantId, loginIdentifier: def.loginIdentifier },
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
        data: { tenantId, fullName: def.fullName },
      });
      const account = await this.prisma.userAccount.create({
        data: {
          tenantId,
          employeeId: employee.id,
          loginIdentifier: def.loginIdentifier,
          passwordHash,
          status: 1,
        },
      });
      userAccountId = account.id;
      employeeId = employee.id;
    }

    // 在籍レコード（DEBUGDEPTに配属）
    const existingEmployment = await this.prisma.employment.findFirst({
      where: { tenantId, employeeId, status: 1 },
    });
    if (!existingEmployment) {
      await this.prisma.employment.create({
        data: {
          tenantId,
          employeeId,
          organizationId: deptOrgId,
          employmentType: 1,
          startDate: new Date('2020-01-01'),
          status: 1,
        },
      });
    }

    const scopeId =
      def.scopeType === 4 ? 0
      : def.scopeType === 3 || def.scopeType === 2 ? deptOrgId
      : employeeId;

    const existingRole = await this.prisma.roleAssignment.findFirst({
      where: { tenantId, userAccountId, roleType: def.roleType, scopeType: def.scopeType, scopeId },
    });

    if (existingRole) {
      if (existingRole.effectiveTo !== null) {
        await this.prisma.roleAssignment.update({
          where: { id: existingRole.id },
          data: { effectiveTo: null },
        });
      }
    } else {
      await this.prisma.roleAssignment.deleteMany({ where: { tenantId, userAccountId } });
      await this.prisma.roleAssignment.create({
        data: {
          tenantId,
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

  private async upsertExtraEmployee(
    def: ExtraEmployeeDef,
    tenantId: number,
    orgIdByCode: Map<string, number>,
  ): Promise<void> {
    const existing = await this.prisma.employee.findFirst({
      where: { tenantId, employeeNumber: def.number, isDeleted: false },
    });

    let employeeId: number;
    if (existing) {
      employeeId = existing.id;
      await this.prisma.employee.update({
        where: { id: existing.id },
        data: { fullName: def.fullName, displayName: def.displayName },
      });
    } else {
      const created = await this.prisma.employee.create({
        data: { tenantId, employeeNumber: def.number, fullName: def.fullName, displayName: def.displayName },
      });
      employeeId = created.id;
    }

    // 主所属組織
    const primaryOrgId = orgIdByCode.get(def.orgCode);
    if (primaryOrgId !== undefined) {
      const hasEmployment = await this.prisma.employment.findFirst({
        where: { tenantId, employeeId, organizationId: primaryOrgId, endDate: null },
      });
      if (!hasEmployment) {
        await this.prisma.employment.create({
          data: {
            tenantId,
            employeeId,
            organizationId: primaryOrgId,
            employmentType: 1,
            startDate: new Date('2022-04-01'),
            status: 1,
          },
        });
      }
    }

    // 兼務組織
    if (def.secondOrgCode) {
      const secondOrgId = orgIdByCode.get(def.secondOrgCode);
      if (secondOrgId !== undefined) {
        const hasSecondEmployment = await this.prisma.employment.findFirst({
          where: { tenantId, employeeId, organizationId: secondOrgId, endDate: null },
        });
        if (!hasSecondEmployment) {
          await this.prisma.employment.create({
            data: {
              tenantId,
              employeeId,
              organizationId: secondOrgId,
              employmentType: 1,
              startDate: new Date('2022-04-01'),
              status: 1,
            },
          });
        }
      }
    }
  }
}
