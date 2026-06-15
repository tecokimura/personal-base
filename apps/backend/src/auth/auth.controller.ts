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
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, COOKIE_NAME } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './guards/session.guard';
import { AuthenticatedRequest } from './types/authenticated-request';
import { AuditService } from '../audit/audit.service';
import { RoleAssignmentService } from './role-assignment/role-assignment.service';
import { TwoFactorService } from './two-factor/two-factor.service';
import { SessionService } from './session/session.service';
import { TenantResolverService } from './tenant-resolver/tenant-resolver.service';
import { hashToken } from './utils/token.util';
import { PrismaService } from '../prisma/prisma.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export interface MeResponse {
  id: number;
  tenantId: number;
  tenantName: string;
  employeeId: number;
  employeeName: string;
  employeeNumber: string | null;
  status: number;
  lastLoggedInAt: Date | null;
  roleTypes: number[];
  twoFactorPending: boolean;
  twoFactorSetupRequired: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly twoFactorService: TwoFactorService,
    private readonly sessionService: SessionService,
    private readonly tenantResolver: TenantResolverService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('tenant')
  async getTenant(@Req() req: Request): Promise<{ id: number; name: string; code: string }> {
    const tenant = await this.tenantResolver.resolveFromRequest(req);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return { id: tenant.id, name: tenant.name, code: tenant.tenantCode };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const resolvedTenant = await this.tenantResolver.resolveFromRequest(req);
    if (!resolvedTenant) throw new NotFoundException('Tenant not found');

    const { rawToken, expiresAt, userAccount, twoFactorPending, twoFactorSetupRequired } =
      await this.authService.login(resolvedTenant.id, body);

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

    if (twoFactorPending) {
      const [tenant, employee] = await Promise.all([
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
        roleTypes: [],
        twoFactorPending: true,
        twoFactorSetupRequired,
      };
    }

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
      twoFactorPending: false,
      twoFactorSetupRequired: false,
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
  async me(@Req() req: AuthenticatedRequest): Promise<MeResponse> {
    const { userAccount } = req;

    if (!req.twoFactorVerified) {
      const [tfa, tenant, employee] = await Promise.all([
        this.twoFactorService.getByUserAccountId(userAccount.id),
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
        roleTypes: [],
        twoFactorPending: true,
        twoFactorSetupRequired: !tfa?.twoFactorEnabled,
      };
    }

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
      twoFactorPending: false,
      twoFactorSetupRequired: false,
    };
  }

  // ── 2FA エンドポイント（twoFactorVerified=false のセッションでもアクセス可）──

  @Get('2fa/status')
  @UseGuards(SessionGuard)
  async getTwoFactorStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ enabled: boolean; enabledAt: Date | null }> {
    const tfa = await this.twoFactorService.getByUserAccountId(req.userAccount.id);
    if (!tfa || !tfa.twoFactorEnabled) return { enabled: false, enabledAt: null };
    return { enabled: true, enabledAt: tfa.updatedAt };
  }

  @Get('2fa/setup/init')
  @UseGuards(SessionGuard)
  async initTwoFactorSetup(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ qrCodeUrl: string }> {
    const { userAccount } = req;
    return this.twoFactorService.initSetup(
      userAccount.id,
      userAccount.tenantId,
      userAccount.loginIdentifier,
    );
  }

  @Post('2fa/setup/confirm')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async confirmTwoFactorSetup(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ): Promise<{ backupCodes: string[] }> {
    const result = await this.twoFactorService.confirmSetup(req.userAccount.id, body.code);
    await this.sessionService.markTwoFactorVerified(hashToken(req.rawSessionToken));
    return result;
  }

  @Post('2fa/verify')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ): Promise<{ success: boolean }> {
    const valid = await this.twoFactorService.verifyTOTP(req.userAccount.id, body.code);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    await this.sessionService.markTwoFactorVerified(hashToken(req.rawSessionToken));
    return { success: true };
  }

  @Post('2fa/backup-verify')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async verifyBackupCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ): Promise<{ success: boolean }> {
    const valid = await this.twoFactorService.verifyBackupCode(req.userAccount.id, body.code);
    if (!valid) throw new UnauthorizedException('Invalid backup code');
    await this.sessionService.markTwoFactorVerified(hashToken(req.rawSessionToken));
    return { success: true };
  }
}
