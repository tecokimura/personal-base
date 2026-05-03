import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import {
  OrganizationService,
  OrganizationView,
  OrganizationLeaderView,
  OrganizationNode,
} from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddLeaderDto } from './dto/add-leader.dto';
import { TerminateLeaderDto } from './dto/terminate-leader.dto';

@Controller('organizations')
@UseGuards(SessionGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest): Promise<OrganizationView[]> {
    return this.organizationService.findAll(req.userAccount.tenantId);
  }

  // Must be declared before :id to avoid routing conflict
  @Get('tree')
  async getTree(@Req() req: AuthenticatedRequest): Promise<OrganizationNode[]> {
    return this.organizationService.getTree(req.userAccount.tenantId);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrganizationView> {
    return this.organizationService.findById(id, req.userAccount.tenantId);
  }

  @Post()
  async create(
    @Body() body: CreateOrganizationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrganizationView> {
    return this.organizationService.create(this.toAuthContext(req), body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrganizationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrganizationView> {
    return this.organizationService.update(this.toAuthContext(req), id, body);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.organizationService.deactivate(this.toAuthContext(req), id);
    return { message: 'ok' };
  }

  @Get(':id/leaders')
  async getLeaders(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeTerminated') includeTerminated: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrganizationLeaderView[]> {
    return this.organizationService.getLeaders(
      this.toAuthContext(req),
      id,
      includeTerminated === 'true',
    );
  }

  @Post(':id/leaders')
  async addLeader(
    @Param('id', ParseIntPipe) orgId: number,
    @Body() body: AddLeaderDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrganizationLeaderView> {
    return this.organizationService.addLeader(this.toAuthContext(req), orgId, {
      employeeId: body.employeeId,
      leaderType: body.leaderType,
      isPrimaryLeader: body.isPrimaryLeader,
      startDate: new Date(body.startDate),
    });
  }

  @Post(':id/leaders/:leaderId/terminate')
  @HttpCode(HttpStatus.OK)
  async terminateLeader(
    @Param('id', ParseIntPipe) orgId: number,
    @Param('leaderId', ParseIntPipe) leaderId: number,
    @Body() body: TerminateLeaderDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.organizationService.terminateLeader(
      this.toAuthContext(req),
      orgId,
      leaderId,
      new Date(body.endDate),
    );
    return { message: 'ok' };
  }

  private toAuthContext(req: AuthenticatedRequest): AuthContext {
    return {
      userAccountId: req.userAccount.id,
      tenantId: req.userAccount.tenantId,
    };
  }
}
