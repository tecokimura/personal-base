import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Req,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Employee } from '@prisma/client';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  AuthorizationService,
  AuthContext,
} from '../authorization/authorization.service';
import { Permission } from '../authorization/constants';
import { AdminService } from './admin.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post('role-assignments')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AssignRoleDto,
  ): Promise<void> {
    const ctx: AuthContext = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(
      ctx,
      Permission.MANAGE_ROLE_ASSIGNMENTS,
      ctx.tenantId,
    );
    await this.adminService.assignRole(ctx, dto);
  }

  @Delete('role-assignments/:id')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const ctx: AuthContext = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(
      ctx,
      Permission.MANAGE_ROLE_ASSIGNMENTS,
      ctx.tenantId,
    );
    await this.adminService.revokeRole(Number(id), ctx);
  }

  @Get('employees/deleted')
  @UseGuards(SessionGuard)
  async listDeletedEmployees(
    @Req() req: AuthenticatedRequest,
  ): Promise<Employee[]> {
    const ctx: AuthContext = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(
      ctx,
      Permission.MANAGE_SOFT_DELETED,
      ctx.tenantId,
    );
    return this.adminService.listDeletedEmployees(ctx.tenantId);
  }

  @Patch('employees/:id/restore')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const ctx: AuthContext = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(
      ctx,
      Permission.MANAGE_SOFT_DELETED,
      ctx.tenantId,
    );
    await this.adminService.restoreEmployee(Number(id), ctx);
  }

  @Patch('employees/:id/soft-delete')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const ctx: AuthContext = {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
    await this.authorizationService.assertCan(
      ctx,
      Permission.MANAGE_SOFT_DELETED,
      ctx.tenantId,
    );
    await this.adminService.softDeleteEmployee(Number(id), ctx);
  }
}
