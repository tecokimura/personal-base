import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { TenantService } from '../tenant/tenant.service';

@Module({ imports: [TenantModule] })
class BootstrapModule {}

interface ParsedArgs {
  tenantCode: string;
  name: string;
}

function parseArgs(): ParsedArgs {
  const raw = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );

  const tenantCode = raw['tenantCode'];
  const name = raw['name'];

  if (!tenantCode || !name) {
    console.error(
      'Usage: ts-node src/commands/create-tenant.command.ts' +
        ' --tenantCode=<code> --name=<display name>',
    );
    process.exit(1);
  }

  return { tenantCode, name };
}

async function main(): Promise<void> {
  const { tenantCode, name } = parseArgs();

  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['error', 'warn'],
  });

  const tenantService = app.get(TenantService);

  const tenant = await tenantService.createTenant(tenantCode, name);
  console.log(`Tenant created: id=${tenant.id}, tenantCode=${tenant.tenantCode}, name=${tenant.name}`);

  await app.close();
}

main().catch((err: unknown) => {
  console.error(
    'Failed to create tenant:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
