import { Injectable } from '@nestjs/common';
import { UserAccount } from '@prisma/client';
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
}
