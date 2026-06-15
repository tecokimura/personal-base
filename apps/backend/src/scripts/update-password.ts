import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [loginIdentifier, newPassword] = process.argv.slice(2);
  if (!loginIdentifier || !newPassword) {
    console.error('Usage: ts-node update-password.ts <loginIdentifier> <newPassword>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const result = await prisma.userAccount.updateMany({
    where: { loginIdentifier },
    data: { passwordHash: hash },
  });
  console.log(`Updated ${result.count} record(s) for ${loginIdentifier}`);
}

main().finally(() => prisma.$disconnect());
