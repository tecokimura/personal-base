/**
 * E2E テスト用フィクスチャのべき等セットアップコマンド。
 * テナント・HR_ADMIN ユーザー・一般ユーザー（非 HR_ADMIN）・組織を upsert し、JSON を stdout に出力する。
 * 出力 JSON: { tenantId, employeeId, loginIdentifier, password, organizationId,
 *              memberEmployeeId, memberLoginIdentifier, memberPassword }
 *
 * 既存データがある場合も以下を保証する:
 *   - Employee が論理削除されていれば復元 (isDeleted=false, deletedAt=null, fullName を既知値に戻す)
 *   - UserAccount の passwordHash と status を既知値に戻す
 *   - HR_ADMIN + TENANT_ALL(scopeId=0) の RoleAssignment が有効状態で存在する
 *   - member ユーザーは RoleAssignment をすべて削除して非 HR_ADMIN 状態を保証する
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @personal-base/backend setup-e2e-fixtures
 */
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const TENANT_CODE = 'E2ETEST';
const TENANT_NAME = 'E2E テストテナント';
const LOGIN_IDENTIFIER = 'e2e-admin@test.local';
const PASSWORD = 'E2ePassword1!';
const FULL_NAME = 'E2E Admin';
const ORG_CODE = 'E2EORG';
const ORG_NAME = 'E2E テスト組織';

const MEMBER_LOGIN_IDENTIFIER = 'e2e-member@test.local';
const MEMBER_PASSWORD = 'E2ePassword1!';
const MEMBER_FULL_NAME = 'E2E Member';

const ROLE_TYPE_HR_ADMIN = 1;
const SCOPE_TYPE_TENANT_ALL = 4;
const SCOPE_ID_TENANT_ALL = 0;

// ── 追加組織定義 ────────────────────────────────────────────────
const EXTRA_ORGS = [
  { code: 'EXEC',    name: '役員',       parent: ORG_CODE, order: 10 },
  { code: 'MGMT',    name: '管理部',     parent: 'EXEC',   order: 20 },
  { code: 'SYS',     name: 'システム部', parent: 'EXEC',   order: 30 },
  { code: 'SVC',     name: 'サービス部', parent: 'EXEC',   order: 40 },
] as const;

// ── 追加社員定義（supervisor は employeeNumber で参照） ──────────
const EXTRA_EMPLOYEES: Array<{
  number: string;
  fullName: string;
  orgCode: string;
  supervisorNumber: string | null;
}> = [
  { number: 'EMP-001', fullName: '山田 太郎', orgCode: 'EXEC', supervisorNumber: null },
  { number: 'EMP-002', fullName: '鈴木 一郎', orgCode: 'EXEC', supervisorNumber: 'EMP-001' },
  { number: 'EMP-003', fullName: '田中 花子', orgCode: 'EXEC', supervisorNumber: 'EMP-001' },
  { number: 'EMP-004', fullName: '佐藤 次郎', orgCode: 'MGMT', supervisorNumber: 'EMP-002' },
  { number: 'EMP-005', fullName: '高橋 美咲', orgCode: 'MGMT', supervisorNumber: 'EMP-004' },
  { number: 'EMP-006', fullName: '伊藤 健太', orgCode: 'SYS',  supervisorNumber: 'EMP-003' },
  { number: 'EMP-007', fullName: '渡辺 雅人', orgCode: 'SYS',  supervisorNumber: 'EMP-006' },
  { number: 'EMP-008', fullName: '山本 聡',   orgCode: 'SYS',  supervisorNumber: 'EMP-006' },
  { number: 'EMP-009', fullName: '中村 友里', orgCode: 'SYS',  supervisorNumber: 'EMP-006' },
  { number: 'EMP-010', fullName: '小林 拓也', orgCode: 'SYS',  supervisorNumber: 'EMP-006' },
  { number: 'EMP-011', fullName: '加藤 由美', orgCode: 'SVC',  supervisorNumber: 'EMP-003' },
  { number: 'EMP-012', fullName: '吉田 晶',   orgCode: 'SVC',  supervisorNumber: 'EMP-011' },
  { number: 'EMP-013', fullName: '松本 直樹', orgCode: 'SVC',  supervisorNumber: 'EMP-011' },
];

interface FixtureState {
  tenantId: number;
  employeeId: number;
  loginIdentifier: string;
  password: string;
  organizationId: number;
  memberEmployeeId: number;
  memberLoginIdentifier: string;
  memberPassword: string;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ log: [] });

  try {
    // 1. Upsert tenant
    const tenant = await prisma.tenant.upsert({
      where: { tenantCode: TENANT_CODE },
      create: { tenantCode: TENANT_CODE, name: TENANT_NAME },
      update: {},
    });

    // 2. Upsert HR_ADMIN user account
    const existingAccount = await prisma.userAccount.findFirst({
      where: { tenantId: tenant.id, loginIdentifier: LOGIN_IDENTIFIER },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    let employeeId: number;

    if (existingAccount) {
      employeeId = existingAccount.employeeId;

      // 2a. パスワード・ステータスを既知値に戻す
      await prisma.userAccount.update({
        where: { id: existingAccount.id },
        data: { passwordHash, status: 1 },
      });

      // 2b. Employee が論理削除されていれば復元し、氏名も既知値に戻す
      await prisma.employee.update({
        where: { id: employeeId },
        data: { isDeleted: false, deletedAt: null, fullName: FULL_NAME },
      });

      // 2c. HR_ADMIN + TENANT_ALL の RoleAssignment が有効状態で存在することを保証する
      const existingRole = await prisma.roleAssignment.findFirst({
        where: {
          tenantId: tenant.id,
          userAccountId: existingAccount.id,
          roleType: ROLE_TYPE_HR_ADMIN,
          scopeType: SCOPE_TYPE_TENANT_ALL,
          scopeId: SCOPE_ID_TENANT_ALL,
        },
      });

      if (existingRole) {
        // effectiveTo が設定されていれば（失効済み）null に戻す
        if (existingRole.effectiveTo !== null) {
          await prisma.roleAssignment.update({
            where: { id: existingRole.id },
            data: { effectiveTo: null },
          });
        }
      } else {
        // RoleAssignment 自体が存在しない場合は新規作成
        await prisma.roleAssignment.create({
          data: {
            tenantId: tenant.id,
            userAccountId: existingAccount.id,
            roleType: ROLE_TYPE_HR_ADMIN,
            scopeType: SCOPE_TYPE_TENANT_ALL,
            scopeId: SCOPE_ID_TENANT_ALL,
            effectiveFrom: new Date(),
          },
        });
      }
    } else {
      // 新規作成
      const employee = await prisma.employee.create({
        data: { tenantId: tenant.id, fullName: FULL_NAME },
      });
      const userAccount = await prisma.userAccount.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          loginIdentifier: LOGIN_IDENTIFIER,
          passwordHash,
          status: 1,
        },
      });
      await prisma.roleAssignment.create({
        data: {
          tenantId: tenant.id,
          userAccountId: userAccount.id,
          roleType: ROLE_TYPE_HR_ADMIN,
          scopeType: SCOPE_TYPE_TENANT_ALL,
          scopeId: SCOPE_ID_TENANT_ALL,
          effectiveFrom: new Date(),
        },
      });
      employeeId = employee.id;
    }

    // 3. Upsert non-HR_ADMIN member user (RoleAssignment なし)
    const existingMember = await prisma.userAccount.findFirst({
      where: { tenantId: tenant.id, loginIdentifier: MEMBER_LOGIN_IDENTIFIER },
    });

    const memberPasswordHash = await bcrypt.hash(MEMBER_PASSWORD, 10);
    let memberEmployeeId: number;

    if (existingMember) {
      memberEmployeeId = existingMember.employeeId;
      await prisma.userAccount.update({
        where: { id: existingMember.id },
        data: { passwordHash: memberPasswordHash, status: 1 },
      });
      await prisma.employee.update({
        where: { id: memberEmployeeId },
        data: { isDeleted: false, deletedAt: null, fullName: MEMBER_FULL_NAME },
      });
      // 非 HR_ADMIN 前提を保証するため、既存の RoleAssignment をすべて削除する
      await prisma.roleAssignment.deleteMany({
        where: { tenantId: tenant.id, userAccountId: existingMember.id },
      });
    } else {
      const memberEmployee = await prisma.employee.create({
        data: { tenantId: tenant.id, fullName: MEMBER_FULL_NAME },
      });
      await prisma.userAccount.create({
        data: {
          tenantId: tenant.id,
          employeeId: memberEmployee.id,
          loginIdentifier: MEMBER_LOGIN_IDENTIFIER,
          passwordHash: memberPasswordHash,
          status: 1,
        },
      });
      memberEmployeeId = memberEmployee.id;
    }

    // 4. Upsert organization
    const existingOrg = await prisma.organization.findFirst({
      where: { tenantId: tenant.id, organizationCode: ORG_CODE },
    });
    let organizationId: number;
    if (existingOrg) {
      organizationId = existingOrg.id;
    } else {
      const org = await prisma.organization.create({
        data: {
          tenantId: tenant.id,
          organizationName: ORG_NAME,
          organizationCode: ORG_CODE,
          isActive: true,
        },
      });
      organizationId = org.id;
    }

    // 5. Upsert extra organizations (役員 / 管理部 / システム部 / サービス部)
    // E2EORG をルートとして事前登録し、EXEC の親として参照できるようにする
    const orgIdByCode = new Map<string, number>();
    orgIdByCode.set(ORG_CODE, organizationId);

    for (const def of EXTRA_ORGS) {
      const parentId = orgIdByCode.get(def.parent) ?? null;
      const existing = await prisma.organization.findFirst({
        where: { tenantId: tenant.id, organizationCode: def.code },
        select: { id: true, parentOrganizationId: true },
      });
      if (existing) {
        orgIdByCode.set(def.code, existing.id);
        // 親が変わっていれば更新（E2EORG → EXEC 階層修正のべき等対応）
        if (existing.parentOrganizationId !== parentId) {
          await prisma.organization.update({
            where: { id: existing.id },
            data: { parentOrganizationId: parentId },
          });
        }
      } else {
        const created = await prisma.organization.create({
          data: {
            tenantId: tenant.id,
            organizationCode: def.code,
            organizationName: def.name,
            parentOrganizationId: parentId,
            displayOrder: def.order,
            isActive: true,
          },
        });
        orgIdByCode.set(def.code, created.id);
      }
    }

    // 6. Upsert extra employees and their primary employments
    // Pass 1: create employee records, build number→id map
    const empIdByNumber = new Map<string, number>();
    for (const def of EXTRA_EMPLOYEES) {
      const existing = await prisma.employee.findFirst({
        where: { tenantId: tenant.id, employeeNumber: def.number, isDeleted: false },
        select: { id: true },
      });
      if (existing) {
        empIdByNumber.set(def.number, existing.id);
      } else {
        const created = await prisma.employee.create({
          data: {
            tenantId: tenant.id,
            employeeNumber: def.number,
            fullName: def.fullName,
            displayName: def.fullName,
          },
        });
        empIdByNumber.set(def.number, created.id);
      }
    }

    // Pass 2: create primary employments with supervisor references
    for (const def of EXTRA_EMPLOYEES) {
      const empId = empIdByNumber.get(def.number)!;
      const orgId = orgIdByCode.get(def.orgCode)!;
      const supervisorId = def.supervisorNumber ? (empIdByNumber.get(def.supervisorNumber) ?? null) : null;

      const existingEmp = await prisma.employment.findFirst({
        where: { tenantId: tenant.id, employeeId: empId, isPrimaryAssignment: true, status: 1 },
        select: { id: true },
      });
      if (!existingEmp) {
        await prisma.employment.create({
          data: {
            tenantId: tenant.id,
            employeeId: empId,
            organizationId: orgId,
            employmentType: 1,
            isPrimaryAssignment: true,
            supervisorEmployeeId: supervisorId,
            startDate: new Date('2023-04-01'),
            status: 1,
          },
        });
      }
    }

    const state: FixtureState = {
      tenantId: tenant.id,
      employeeId,
      loginIdentifier: LOGIN_IDENTIFIER,
      password: PASSWORD,
      organizationId,
      memberEmployeeId,
      memberLoginIdentifier: MEMBER_LOGIN_IDENTIFIER,
      memberPassword: MEMBER_PASSWORD,
    };

    process.stdout.write(JSON.stringify(state) + '\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`E2E fixture setup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
