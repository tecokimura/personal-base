import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
import {
  CreateSessionInput,
  SessionRepository,
} from './session.repository';

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async createSession(input: CreateSessionInput): Promise<Session> {
    return this.sessionRepository.create(input);
  }

  async revokeByTokenHash(tokenHash: string): Promise<Session | null> {
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (session === null || session.revokedAt !== null) {
      return null;
    }
    return this.sessionRepository.revoke(session.id, new Date());
  }

  async revokeAllSessionsForAccount(userAccountId: number): Promise<void> {
    await this.sessionRepository.revokeAllByUserAccountId(
      userAccountId,
      new Date(),
    );
  }

  async findValidByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.sessionRepository.findValidByTokenHash(tokenHash);
  }

  async markTwoFactorVerified(tokenHash: string): Promise<void> {
    await this.sessionRepository.markTwoFactorVerified(tokenHash);
  }
}
