import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserAccount } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { UserAccountService } from './user-account/user-account.service';
import { SessionService } from './session/session.service';
import { TwoFactorService } from './two-factor/two-factor.service';
import { generateToken, hashToken } from './utils/token.util';

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'session_token';

export { COOKIE_NAME };

export interface LoginResult {
  rawToken: string;
  expiresAt: Date;
  userAccount: UserAccount;
  twoFactorPending: boolean;
  twoFactorSetupRequired: boolean;
}

export interface SessionVerifyResult {
  userAccount: UserAccount;
  twoFactorVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly sessionService: SessionService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const userAccount = await this.userAccountService.findByLoginIdentifier(
      dto.tenantId,
      dto.loginIdentifier,
    );

    if (userAccount === null || userAccount.status !== 1) {
      throw new UnauthorizedException();
    }

    const passwordMatch = await bcrypt.compare(dto.password, userAccount.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException();
    }

    const policy = await this.twoFactorService.getTenantPolicy(dto.tenantId);
    const twoFactorRequired = policy === 2;

    let twoFactorVerified = true;
    let twoFactorPending = false;
    let twoFactorSetupRequired = false;

    if (twoFactorRequired) {
      const tfa = await this.twoFactorService.getByUserAccountId(userAccount.id);
      twoFactorVerified = false;
      twoFactorPending = true;
      twoFactorSetupRequired = !tfa?.twoFactorEnabled;
    }

    const rawToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await this.sessionService.createSession({
      tenantId: dto.tenantId,
      userAccountId: userAccount.id,
      sessionTokenHash: hashToken(rawToken),
      expiresAt,
      twoFactorVerified,
    });

    await this.userAccountService.updateLastLoggedInAt(userAccount.id, new Date());

    return { rawToken, expiresAt, userAccount, twoFactorPending, twoFactorSetupRequired };
  }

  async logout(rawToken: string): Promise<void> {
    await this.sessionService.revokeByTokenHash(hashToken(rawToken));
  }

  async verifySession(rawToken: string): Promise<SessionVerifyResult | null> {
    const session = await this.sessionService.findValidByTokenHash(hashToken(rawToken));
    if (session === null) {
      return null;
    }

    const userAccount = await this.userAccountService.findById(session.userAccountId);
    if (userAccount === null || userAccount.status !== 1) {
      return null;
    }

    return { userAccount, twoFactorVerified: session.twoFactorVerified };
  }
}
