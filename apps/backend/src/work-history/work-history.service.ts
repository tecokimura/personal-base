import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WorkHistory } from '@prisma/client';
import { AuthContext } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { WorkHistoryRepository } from './work-history.repository';
import { CreateWorkHistoryDto } from './dto/create-work-history.dto';
import { UpdateWorkHistoryDto } from './dto/update-work-history.dto';

@Injectable()
export class WorkHistoryService {
  constructor(
    private readonly repo: WorkHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(ctx: AuthContext, employeeId: number): Promise<WorkHistory[]> {
    if (ctx.employeeId !== employeeId) {
      throw new ForbiddenException('You can only view your own work history');
    }
    return this.repo.findByEmployee(employeeId, ctx.tenantId);
  }

  async create(ctx: AuthContext, employeeId: number, dto: CreateWorkHistoryDto): Promise<WorkHistory> {
    if (ctx.employeeId !== employeeId) {
      throw new ForbiddenException('You can only create work history for yourself');
    }
    this.validateYearMonthRange(dto.yearMonthFrom, dto.yearMonthTo, dto.isCurrent);

    const record = await this.repo.create({
      tenantId: ctx.tenantId,
      employeeId,
      yearMonthFrom: dto.yearMonthFrom,
      yearMonthTo: dto.isCurrent ? undefined : dto.yearMonthTo,
      isCurrent: dto.isCurrent ?? false,
      workSummary: dto.workSummary,
      toolsUsed: dto.toolsUsed,
      roleName: dto.roleName,
      teamSize: dto.teamSize,
      projectCode: dto.projectCode,
      updatedBy: ctx.userAccountId,
    });

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'WorkHistory',
      entityId: record.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
    });

    return record;
  }

  async update(ctx: AuthContext, id: number, dto: UpdateWorkHistoryDto): Promise<WorkHistory> {
    const existing = await this.repo.findById(id, ctx.tenantId);
    if (!existing) throw new NotFoundException(`WorkHistory ${id} not found`);
    if (existing.employeeId !== ctx.employeeId) {
      throw new ForbiddenException('You can only update your own work history');
    }

    const nextFrom = dto.yearMonthFrom ?? existing.yearMonthFrom;
    const nextTo = dto.yearMonthTo !== undefined ? dto.yearMonthTo : existing.yearMonthTo ?? undefined;
    const nextIsCurrent = dto.isCurrent !== undefined ? dto.isCurrent : existing.isCurrent;
    this.validateYearMonthRange(nextFrom, nextTo, nextIsCurrent);

    const record = await this.repo.update(id, ctx.tenantId, {
      yearMonthFrom: dto.yearMonthFrom,
      yearMonthTo: nextIsCurrent ? null : dto.yearMonthTo,
      isCurrent: dto.isCurrent,
      workSummary: dto.workSummary,
      toolsUsed: dto.toolsUsed,
      roleName: dto.roleName,
      teamSize: dto.teamSize,
      projectCode: dto.projectCode,
      updatedBy: ctx.userAccountId,
    });

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'WorkHistory',
      entityId: id,
      actionType: 'UPDATE',
      changedByEmployeeId: ctx.employeeId,
    });

    return record;
  }

  async remove(ctx: AuthContext, id: number): Promise<void> {
    const existing = await this.repo.findById(id, ctx.tenantId);
    if (!existing) throw new NotFoundException(`WorkHistory ${id} not found`);
    if (existing.employeeId !== ctx.employeeId) {
      throw new ForbiddenException('You can only delete your own work history');
    }

    await this.repo.delete(id, ctx.tenantId);

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'WorkHistory',
      entityId: id,
      actionType: 'DELETE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  private validateYearMonthRange(
    from: string,
    to: string | null | undefined,
    isCurrent: boolean | null | undefined,
  ): void {
    if (isCurrent) return;
    if (to && to < from) {
      throw new UnprocessableEntityException('yearMonthTo must be on or after yearMonthFrom');
    }
  }
}
