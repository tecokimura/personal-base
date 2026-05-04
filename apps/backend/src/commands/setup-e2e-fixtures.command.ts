/**
 * E2E テスト用フィクスチャのべき等セットアップコマンド。
 * テナント・HR_ADMIN ユーザー・組織を upsert し、JSON を stdout に出力する。
 * 出力 JSON: { tenantId, employeeId, loginIdentifier, password, organizationId }
 *
 * 既存データがある場合も以下を保証する:
 *   - Employee が論理削除されていれば復元 (isDeleted=false, deletedAt=null, fullName を既知値に戻す)
 *   - UserAccount の passwordHash と status を既知値に戻す
 *   - HR_ADMIN + TENANT_ALL(scopeId=0) の RoleAssignment が有効状態で存在する
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

const ROLE_TYPE_HR_ADMIN = 1;
const SCOPE_TYPE_TENANT_ALL = 4;
const SCOPE_ID_TENANT_ALL = 0;

interface FixtureState {
  tenantId: number;
  employeeId: number;
  loginIdentifier: string;
  password: string;
  organizationId: number;
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

    // 3. Upsert organization
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

    const state: FixtureState = {
      tenantId: tenant.id,
      employeeId,
      loginIdentifier: LOGIN_IDENTIFIER,
      password: PASSWORD,
      organizationId,
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
