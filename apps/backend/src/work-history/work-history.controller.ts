import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkHistory } from '@prisma/client';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { WorkHistoryService } from './work-history.service';
import { CreateWorkHistoryDto } from './dto/create-work-history.dto';
import { UpdateWorkHistoryDto } from './dto/update-work-history.dto';

@Controller()
@UseGuards(SessionGuard)
export class WorkHistoryController {
  constructor(private readonly workHistoryService: WorkHistoryService) {}

  @Get('employees/:employeeId/work-histories')
  async list(
    @Req() req: AuthenticatedRequest,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ): Promise<WorkHistory[]> {
    const ctx = this.toCtx(req);
    return this.workHistoryService.list(ctx, employeeId);
  }

  @Post('employees/:employeeId/work-histories')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: CreateWorkHistoryDto,
  ): Promise<WorkHistory> {
    const ctx = this.toCtx(req);
    return this.workHistoryService.create(ctx, employeeId, dto);
  }

  @Patch('work-histories/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkHistoryDto,
  ): Promise<WorkHistory> {
    const ctx = this.toCtx(req);
    return this.workHistoryService.update(ctx, id, dto);
  }

  @Delete('work-histories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const ctx = this.toCtx(req);
    return this.workHistoryService.remove(ctx, id);
  }

  private toCtx(req: AuthenticatedRequest): AuthContext {
    return {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
  }
}
