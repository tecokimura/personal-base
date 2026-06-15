import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
@Module({ imports: [PrismaModule] })
class BootstrapModule {}

interface ParsedArgs {
  tenantSlug: string;
  loginIdentifier: string;
  password: string;
  fullName: string;
}

function parseArgs(): ParsedArgs {
  const raw = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );

  const tenantSlug = raw['tenantSlug'];
  const loginIdentifier = raw['loginIdentifier'];
  const password = raw['password'];
  const fullName = raw['fullName'] ?? loginIdentifier;

  if (!tenantSlug || !loginIdentifier || !password) {
    console.error(
      'Usage: ts-node src/commands/create-employee.command.ts' +
        ' --tenantSlug=demo --loginIdentifier=employee@example.com --password=<password> [--fullName=<name>]',
    );
    process.exit(1);
  }

  return { tenantSlug, loginIdentifier, password, fullName };
}

async function main(): Promise<void> {
  const { tenantSlug, loginIdentifier, password, fullName } = parseArgs();

  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);

  const tenant = await prisma.tenant.findUnique({ where: { tenantCode: tenantSlug } });
  if (!tenant) {
    console.error(`Tenant not found: ${tenantSlug}`);
    process.exit(1);
  }
  const tenantId = tenant.id;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userAccount.findUnique({
      where: { tenantId_loginIdentifier: { tenantId, loginIdentifier } },
    });
    if (existing !== null) {
      throw new Error(
        `loginIdentifier "${loginIdentifier}" already exists in tenant ${tenantSlug}`,
      );
    }

    const employee = await tx.employee.create({
      data: { tenantId, fullName },
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

    // EMPLOYEE ロール（roleType:5, scopeType:1=SELF）
    await tx.roleAssignment.create({
      data: {
        tenantId,
        userAccountId: userAccount.id,
        roleType: 5,
        scopeType: 1,
        scopeId: 0,
        effectiveFrom: new Date(),
      },
    });

    console.log(
      `EMPLOYEE created: employeeId=${employee.id}, userAccountId=${userAccount.id}, tenantId=${tenantId} (${tenantSlug})`,
    );
  });

  await app.close();
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Failed to create employee:', msg);
  process.exit(1);
});
