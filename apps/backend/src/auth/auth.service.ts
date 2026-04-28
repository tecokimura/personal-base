import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserAccount } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { UserAccountService } from './user-account/user-account.service';
import { SessionService } from './session/session.service';
import { generateToken, hashToken } from './utils/token.util';

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'session_token';

export { COOKIE_NAME };

export interface LoginResult {
  rawToken: string;
  expiresAt: Date;
  userAccount: UserAccount;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly sessionService: SessionService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const userAccount = await this.userAccountService.findByLoginIdentifier(
      dto.tenantId,
      dto.loginIdentifier,
    );

    if (userAccount === null || userAccount.status !== 1) {
      throw new UnauthorizedException();
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      userAccount.passwordHash,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException();
    }

    const rawToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await this.sessionService.createSession({
      tenantId: dto.tenantId,
      userAccountId: userAccount.id,
      sessionTokenHash: hashToken(rawToken),
      expiresAt,
    });

    await this.userAccountService.updateLastLoggedInAt(
      userAccount.id,
      new Date(),
    );

    return { rawToken, expiresAt, userAccount };
  }

  async logout(rawToken: string): Promise<void> {
    await this.sessionService.revokeByTokenHash(hashToken(rawToken));
  }

  async verifySession(rawToken: string): Promise<UserAccount | null> {
    const session = await this.sessionService.findValidByTokenHash(
      hashToken(rawToken),
    );
    if (session === null) {
      return null;
    }

    const userAccount = await this.userAccountService.findById(
      session.userAccountId,
    );
    if (userAccount === null || userAccount.status !== 1) {
      return null;
    }

    return userAccount;
  }
}
