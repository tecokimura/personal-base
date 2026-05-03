import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';
import { TenantService } from '../tenant/tenant.service';

@Module({ imports: [PrismaModule, TenantModule] })
class BootstrapModule {}

interface ParsedArgs {
  tenantId: number;
  loginIdentifier: string;
  password: string;
}

function parseArgs(): ParsedArgs {
  const raw = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );

  const tenantId = Number(raw['tenantId']);
  const loginIdentifier = raw['loginIdentifier'];
  const password = raw['password'];

  if (!tenantId || !loginIdentifier || !password) {
    console.error(
      'Usage: ts-node src/commands/create-hr-admin.command.ts' +
        ' --tenantId=1 --loginIdentifier=admin@example.com --password=<password>',
    );
    process.exit(1);
  }

  return { tenantId, loginIdentifier, password };
}

async function main(): Promise<void> {
  const { tenantId, loginIdentifier, password } = parseArgs();

  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['error', 'warn'],
  });

  const tenantService = app.get(TenantService);
  const prisma = app.get(PrismaService);

  await tenantService.assertExists(tenantId);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userAccount.findUnique({
      where: { tenantId_loginIdentifier: { tenantId, loginIdentifier } },
    });
    if (existing !== null) {
      throw new Error(
        `loginIdentifier "${loginIdentifier}" already exists in tenant ${tenantId}`,
      );
    }

    const employee = await tx.employee.create({
      data: { tenantId, fullName: loginIdentifier },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const userAccount = await tx.userAccount.create({
      data: {
        tenantId,
        employeeId: employee.id,
        loginIdentifier,
        passwordHash,
        status: 1,
      },
    });

    await tx.roleAssignment.create({
      data: {
        tenantId,
        userAccountId: userAccount.id,
        roleType: 1,  // HR_ADMIN
        scopeType: 4, // TENANT_ALL
        scopeId: 0,   // 非組織スコープ
        effectiveFrom: new Date(),
      },
    });

    console.log(
      `HR_ADMIN created: employeeId=${employee.id}, userAccountId=${userAccount.id}, tenantId=${tenantId}`,
    );
  });

  await app.close();
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Failed to create HR_ADMIN:', msg);
  process.exit(1);
});
