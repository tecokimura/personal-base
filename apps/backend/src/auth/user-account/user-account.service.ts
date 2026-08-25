import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserAccount } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UserAccountRepository } from './user-account.repository';

@Injectable()
export class UserAccountService {
  constructor(private readonly userAccountRepository: UserAccountRepository) {}

  async findById(id: number): Promise<UserAccount | null> {
    return this.userAccountRepository.findById(id);
  }

  async findByLoginIdentifier(
    tenantId: number,
    loginIdentifier: string,
  ): Promise<UserAccount | null> {
    return this.userAccountRepository.findByTenantAndLoginIdentifier(
      tenantId,
      loginIdentifier,
    );
  }

  async updateLastLoggedInAt(id: number, lastLoggedInAt: Date): Promise<void> {
    return this.userAccountRepository.updateLastLoggedInAt(id, lastLoggedInAt);
  }

  async changePassword(
    userAccountId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const userAccount = await this.userAccountRepository.findById(userAccountId);
    if (!userAccount) throw new UnauthorizedException();

    const passwordMatch = await bcrypt.compare(currentPassword, userAccount.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('現在のパスワードが正しくありません');

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.userAccountRepository.updatePasswordHash(userAccountId, newHash);
  }
}
