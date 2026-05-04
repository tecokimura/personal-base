import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, COOKIE_NAME } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './guards/session.guard';
import { AuthenticatedRequest } from './types/authenticated-request';
import { AuditService } from '../audit/audit.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface MeResponse {
  id: number;
  tenantId: number;
  employeeId: number;
  status: number;
  lastLoggedInAt: Date | null;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { rawToken, expiresAt, userAccount } =
      await this.authService.login(body);

    res.cookie(COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      expires: expiresAt,
    });

    void this.auditService.logLogin({
      tenantId: userAccount.tenantId,
      userAccountId: userAccount.id,
      employeeId: userAccount.employeeId,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    return {
      id: userAccount.id,
      tenantId: userAccount.tenantId,
      employeeId: userAccount.employeeId,
      status: userAccount.status,
      lastLoggedInAt: userAccount.lastLoggedInAt,
    };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(req.rawSessionToken);
    res.clearCookie(COOKIE_NAME);
    return { message: 'ok' };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: AuthenticatedRequest): MeResponse {
    const { userAccount } = req;
    return {
      id: userAccount.id,
      tenantId: userAccount.tenantId,
      employeeId: userAccount.employeeId,
      status: userAccount.status,
      lastLoggedInAt: userAccount.lastLoggedInAt,
    };
  }
}
