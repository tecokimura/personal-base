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
import { Qualification } from '@prisma/client';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { QualificationService } from './qualification.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Controller()
@UseGuards(SessionGuard)
export class QualificationController {
  constructor(private readonly qualificationService: QualificationService) {}

  @Get('employees/:employeeId/qualifications')
  async list(
    @Req() req: AuthenticatedRequest,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ): Promise<Qualification[]> {
    const ctx = this.toCtx(req);
    return this.qualificationService.list(ctx, employeeId);
  }

  @Post('employees/:employeeId/qualifications')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: CreateQualificationDto,
  ): Promise<Qualification> {
    const ctx = this.toCtx(req);
    return this.qualificationService.create(ctx, employeeId, dto);
  }

  @Patch('qualifications/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQualificationDto,
  ): Promise<Qualification> {
    const ctx = this.toCtx(req);
    return this.qualificationService.update(ctx, id, dto);
  }

  @Delete('qualifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const ctx = this.toCtx(req);
    return this.qualificationService.remove(ctx, id);
  }

  private toCtx(req: AuthenticatedRequest): AuthContext {
    return {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
  }
}
