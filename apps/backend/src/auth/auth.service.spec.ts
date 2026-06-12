import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import type { UserAccountService } from './user-account/user-account.service';
import type { SessionService } from './session/session.service';
import type { TwoFactorService } from './two-factor/two-factor.service';

const makeUserAccount = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 1,
  employeeId: 1,
  loginIdentifier: 'admin@example.com',
  passwordHash: '$placeholder',
  status: 1,
  lastLoggedInAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeSession = () => ({
  id: 1,
  tenantId: 1,
  userAccountId: 1,
  sessionTokenHash: 'hash',
  expiresAt: new Date(Date.now() + 86400_000),
  revokedAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('AuthService', () => {
  let service: AuthService;
  let mockFindByLoginIdentifier: ReturnType<typeof vi.fn>;
  let mockFindById: ReturnType<typeof vi.fn>;
  let mockUpdateLastLoggedInAt: ReturnType<typeof vi.fn>;
  let mockCreateSession: ReturnType<typeof vi.fn>;
  let mockRevokeByTokenHash: ReturnType<typeof vi.fn>;
  let mockFindValidByTokenHash: ReturnType<typeof vi.fn>;
  let mockGetTenantPolicy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFindByLoginIdentifier = vi.fn();
    mockFindById = vi.fn();
    mockUpdateLastLoggedInAt = vi.fn().mockResolvedValue(undefined);
    mockCreateSession = vi.fn().mockResolvedValue(makeSession());
    mockRevokeByTokenHash = vi.fn().mockResolvedValue(null);
    mockFindValidByTokenHash = vi.fn();
    mockGetTenantPolicy = vi.fn().mockResolvedValue(1);

    const userAccountService = {
      findByLoginIdentifier: mockFindByLoginIdentifier,
      findById: mockFindById,
      updateLastLoggedInAt: mockUpdateLastLoggedInAt,
    } as unknown as UserAccountService;

    const sessionService = {
      createSession: mockCreateSession,
      revokeByTokenHash: mockRevokeByTokenHash,
      findValidByTokenHash: mockFindValidByTokenHash,
    } as unknown as SessionService;

    const twoFactorService = {
      getTenantPolicy: mockGetTenantPolicy,
    } as unknown as TwoFactorService;

    service = new AuthService(userAccountService, sessionService, twoFactorService);
  });

  describe('login', () => {
    it('正しい認証情報でログインできる', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      mockFindByLoginIdentifier.mockResolvedValue(
        makeUserAccount({ passwordHash }),
      );

      const result = await service.login(1, {
        loginIdentifier: 'admin@example.com',
        password: 'correct-password',
      });

      expect(result.rawToken).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.userAccount.id).toBe(1);
      expect(mockCreateSession).toHaveBeenCalledOnce();
      expect(mockUpdateLastLoggedInAt).toHaveBeenCalledOnce();
    });

    it('パスワード不一致で UnauthorizedException をスローする', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      mockFindByLoginIdentifier.mockResolvedValue(
        makeUserAccount({ passwordHash }),
      );

      await expect(
        service.login(1, {
          loginIdentifier: 'admin@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('無効化アカウントで UnauthorizedException をスローする', async () => {
      mockFindByLoginIdentifier.mockResolvedValue(
        makeUserAccount({ status: 2 }),
      );

      await expect(
        service.login(1, {
          loginIdentifier: 'admin@example.com',
          password: 'any-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('存在しないアカウントで UnauthorizedException をスローする', async () => {
      mockFindByLoginIdentifier.mockResolvedValue(null);

      await expect(
        service.login(1, {
          loginIdentifier: 'notfound@example.com',
          password: 'any-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifySession', () => {
    it('有効なセッションで UserAccount を返す', async () => {
      mockFindValidByTokenHash.mockResolvedValue(makeSession());
      mockFindById.mockResolvedValue(makeUserAccount());

      const result = await service.verifySession('raw-token');

      expect(result).not.toBeNull();
      expect(result?.userAccount.id).toBe(1);
    });

    it('セッションが見つからない場合 null を返す', async () => {
      mockFindValidByTokenHash.mockResolvedValue(null);

      const result = await service.verifySession('invalid-token');

      expect(result).toBeNull();
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('期限切れセッションで null を返す（repository が null を返す）', async () => {
      // Repository filters out expired sessions; service treats null as "no valid session"
      mockFindValidByTokenHash.mockResolvedValue(null);

      const result = await service.verifySession('expired-token');

      expect(result).toBeNull();
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('失効済みセッションで null を返す（repository が null を返す）', async () => {
      // Repository filters out revoked sessions; service treats null as "no valid session"
      mockFindValidByTokenHash.mockResolvedValue(null);

      const result = await service.verifySession('revoked-token');

      expect(result).toBeNull();
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('無効化アカウントで null を返す', async () => {
      mockFindValidByTokenHash.mockResolvedValue(makeSession());
      mockFindById.mockResolvedValue(makeUserAccount({ status: 2 }));

      const result = await service.verifySession('raw-token');

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('セッション失効を呼び出す', async () => {
      await service.logout('raw-token');

      expect(mockRevokeByTokenHash).toHaveBeenCalledOnce();
    });
  });
});
