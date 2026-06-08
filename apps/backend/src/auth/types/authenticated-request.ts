import { Request } from 'express';
import { UserAccount } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  userAccount: UserAccount;
  rawSessionToken: string;
  twoFactorVerified: boolean;
}
