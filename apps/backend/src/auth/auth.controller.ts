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
import { RoleAssignmentService } from './role-assignment/role-assignment.service';
import { PrismaService } from '../prisma/prisma.service';

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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly prisma: PrismaService,
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
}
