import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Qualification } from '@prisma/client';
import { AuthContext } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { ScopeResolverService } from '../authorization/scope-resolver.service';
import { QualificationRepository } from './qualification.repository';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Injectable()
export class QualificationService {
  constructor(
    private readonly repo: QualificationRepository,
    private readonly auditService: AuditService,
    private readonly scopeResolverService: ScopeResolverService,
  ) {}

  async list(ctx: AuthContext, employeeId: number): Promise<Qualification[]> {
    const canAccess = await this.scopeResolverService.canAccessQualification(ctx, employeeId);
    if (!canAccess) throw new ForbiddenException();
    return this.repo.findByEmployee(employeeId, ctx.tenantId);
  }

  async create(ctx: AuthContext, employeeId: number, dto: CreateQualificationDto): Promise<Qualification> {
    const canEdit = await this.scopeResolverService.canEditQualification(ctx, employeeId);
    if (!canEdit) throw new ForbiddenException();

    const record = await this.repo.create({
      tenantId: ctx.tenantId,
      employeeId,
      name: dto.name,
      acquiredDate: new Date(dto.acquiredDate),
      note: dto.note,
      updatedBy: ctx.userAccountId,
    });

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Qualification',
      entityId: record.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
    });

    return record;
  }

  async update(ctx: AuthContext, id: number, dto: UpdateQualificationDto): Promise<Qualification> {
    const existing = await this.repo.findById(id, ctx.tenantId);
    if (!existing) throw new NotFoundException(`Qualification ${id} not found`);
    const canEdit = await this.scopeResolverService.canEditQualification(ctx, existing.employeeId);
    if (!canEdit) throw new ForbiddenException();

    const record = await this.repo.update(id, ctx.tenantId, {
      name: dto.name,
      acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : undefined,
      note: dto.note !== undefined ? (dto.note ?? null) : undefined,
      updatedBy: ctx.userAccountId,
    });

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Qualification',
      entityId: id,
      actionType: 'UPDATE',
      changedByEmployeeId: ctx.employeeId,
    });

    return record;
  }

  async remove(ctx: AuthContext, id: number): Promise<void> {
    const existing = await this.repo.findById(id, ctx.tenantId);
    if (!existing) throw new NotFoundException(`Qualification ${id} not found`);
    const canEdit = await this.scopeResolverService.canEditQualification(ctx, existing.employeeId);
    if (!canEdit) throw new ForbiddenException();

    await this.repo.delete(id, ctx.tenantId);

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Qualification',
      entityId: id,
      actionType: 'DELETE',
      changedByEmployeeId: ctx.employeeId,
    });
  }
}
