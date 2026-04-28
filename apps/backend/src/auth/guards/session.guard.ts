import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const rawToken: unknown = req.cookies?.['session_token'];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException();
    }

    const userAccount = await this.authService.verifySession(rawToken);
    if (userAccount === null) {
      throw new UnauthorizedException();
    }

    req.userAccount = userAccount;
    req.rawSessionToken = rawToken;
    return true;
  }
}
