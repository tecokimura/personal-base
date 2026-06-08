import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { COOKIE_NAME } from '../auth/auth.service';
import { SessionService } from '../auth/session/session.service';
import { RoleAssignmentService } from '../auth/role-assignment/role-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateToken, hashToken } from '../auth/utils/token.util';
import { DebugFixturesService } from './debug-fixtures.service';

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface MeResponse {
  id: number;
  tenantId: number;
  tenantName: string;
  employeeId: number;
  employeeName: string;
  employeeNumber: string | null;
  status: number;
  lastLoggedInAt: Date | null;
  roleTypes: number[];
}

@Controller('debug')
export class DebugController {
  constructor(
    private readonly debugFixturesService: DebugFixturesService,
    private readonly sessionService: SessionService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  getStatus(): { enabled: boolean } {
    return { enabled: this.isEnabled() };
  }

  @Post('login/:roleType')
  @HttpCode(HttpStatus.OK)
  async debugLogin(
    @Param('roleType') roleTypeStr: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    if (!this.isEnabled()) {
      throw new NotFoundException();
    }

    const roleType = parseInt(roleTypeStr, 10);
    if (isNaN(roleType) || roleType < 1 || roleType > 5) {
      throw new NotFoundException();
    }

    const userAccountId = await this.debugFixturesService.ensureAndGetUserAccountId(roleType);

    const userAccount = await this.prisma.userAccount.findUniqueOrThrow({
      where: { id: userAccountId },
    });

    const rawToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await this.sessionService.createSession({
      tenantId: userAccount.tenantId,
      userAccountId: userAccount.id,
      sessionTokenHash: hashToken(rawToken),
      expiresAt,
    });

    res.cookie(COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      expires: expiresAt,
    });

    const [roles, tenant, employee] = await Promise.all([
      this.roleAssignmentService.getActiveRoles(userAccount.id),
      this.prisma.tenant.findUniqueOrThrow({ where: { id: userAccount.tenantId } }),
      this.prisma.employee.findUniqueOrThrow({ where: { id: userAccount.employeeId } }),
    ]);

    return {
      id: userAccount.id,
      tenantId: userAccount.tenantId,
      tenantName: tenant.name,
      employeeId: userAccount.employeeId,
      employeeName: employee.displayName ?? employee.fullName,
      employeeNumber: employee.employeeNumber,
      status: userAccount.status,
      lastLoggedInAt: userAccount.lastLoggedInAt,
      roleTypes: roles.map((r) => r.roleType),
    };
  }

  private isEnabled(): boolean {
    return process.env.DEBUG_LOGIN_ENABLED === 'true' && !IS_PRODUCTION;
  }
}
