import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import { TwoFactorAuth } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TwoFactorRepository } from './two-factor.repository';

const BACKUP_CODE_COUNT = 8;
const BCRYPT_ROUNDS = 10;
const ISSUER = 'PersonalBase';

function generateBackupCode(): string {
  const hex = randomBytes(4).toString('hex').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly twoFactorRepository: TwoFactorRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getTenantPolicy(tenantId: number): Promise<number> {
    const setting = await this.prisma.tenantSetting.findUnique({ where: { tenantId } });
    return setting?.twoFactorPolicy ?? 1;
  }

  async setTenantPolicy(tenantId: number, policy: number): Promise<void> {
    await this.prisma.tenantSetting.upsert({
      where: { tenantId },
      update: { twoFactorPolicy: policy },
      create: { tenantId, twoFactorPolicy: policy },
    });
  }

  async getByUserAccountId(userAccountId: number): Promise<TwoFactorAuth | null> {
    return this.twoFactorRepository.findByUserAccountId(userAccountId);
  }

  async initSetup(
    userAccountId: number,
    tenantId: number,
    loginIdentifier: string,
  ): Promise<{ qrCodeUrl: string }> {
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(loginIdentifier, ISSUER, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    await this.twoFactorRepository.upsert(userAccountId, tenantId, { totpSecret: secret });

    return { qrCodeUrl };
  }

  async confirmSetup(
    userAccountId: number,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const tfa = await this.twoFactorRepository.findByUserAccountId(userAccountId);
    if (!tfa) {
      throw new BadRequestException('2FA setup not initialized');
    }

    const isValid = authenticator.verify({ token: code, secret: tfa.totpSecret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
    const backupCodeHashes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, BCRYPT_ROUNDS)),
    );

    await this.twoFactorRepository.activate(userAccountId, backupCodeHashes);

    return { backupCodes };
  }

  async verifyTOTP(userAccountId: number, code: string): Promise<boolean> {
    const tfa = await this.twoFactorRepository.findByUserAccountId(userAccountId);
    if (!tfa || !tfa.twoFactorEnabled) return false;
    return authenticator.verify({ token: code, secret: tfa.totpSecret });
  }

  async verifyBackupCode(userAccountId: number, code: string): Promise<boolean> {
    const tfa = await this.twoFactorRepository.findByUserAccountId(userAccountId);
    if (!tfa || !tfa.twoFactorEnabled) return false;

    for (let i = 0; i < tfa.backupCodeHashes.length; i++) {
      const matches = await bcrypt.compare(code, tfa.backupCodeHashes[i]);
      if (matches) {
        const updatedHashes = tfa.backupCodeHashes.filter((_, idx) => idx !== i);
        await this.twoFactorRepository.updateBackupCodes(userAccountId, updatedHashes);
        return true;
      }
    }
    return false;
  }

  async reset2FA(userAccountId: number): Promise<void> {
    await this.twoFactorRepository.deleteByUserAccountId(userAccountId);
  }
}
