import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

const TWO_FACTOR_ALLOWED_PATHS = ['/auth/me', '/auth/logout', '/auth/2fa'];

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const rawToken: unknown = req.cookies?.['session_token'];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException();
    }

    const result = await this.authService.verifySession(rawToken);
    if (result === null) {
      throw new UnauthorizedException();
    }

    req.userAccount = result.userAccount;
    req.rawSessionToken = rawToken;
    req.twoFactorVerified = result.twoFactorVerified;

    if (!result.twoFactorVerified) {
      const path: string = req.path;
      const isAllowed = TWO_FACTOR_ALLOWED_PATHS.some(
        (p) => path === p || path.startsWith(p + '/'),
      );
      if (!isAllowed) {
        throw new ForbiddenException('TWO_FACTOR_VERIFICATION_REQUIRED');
      }
    }

    return true;
  }
}
