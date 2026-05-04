/**
 * E2E テスト用フィクスチャのべき等セットアップコマンド。
 * テナント・HR_ADMIN ユーザー・組織を upsert し、JSON を stdout に出力する。
 * 出力 JSON: { tenantId, employeeId, loginIdentifier, password, organizationId }
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
const ORG_CODE = 'E2EORG';
const ORG_NAME = 'E2E テスト組織';

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

    let employeeId: number;
    if (existingAccount) {
      employeeId = existingAccount.employeeId;
      const passwordHash = await bcrypt.hash(PASSWORD, 10);
      await prisma.userAccount.update({
        where: { id: existingAccount.id },
        data: { passwordHash, status: 1 },
      });
    } else {
      const employee = await prisma.employee.create({
        data: { tenantId: tenant.id, fullName: 'E2E Admin' },
      });
      const passwordHash = await bcrypt.hash(PASSWORD, 10);
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
          roleType: 1,  // HR_ADMIN
          scopeType: 4, // TENANT_ALL
          scopeId: 0,
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
