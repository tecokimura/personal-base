import { Injectable, ForbiddenException } from '@nestjs/common';
import { EmployeeAdminSection } from '@prisma/client';
import { AuthContext } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { ScopeResolverService } from '../authorization/scope-resolver.service';
import { AdminSectionRepository } from './admin-section.repository';
import { UpdateAdminSectionDto } from './dto/update-admin-section.dto';

@Injectable()
export class AdminSectionService {
  constructor(
    private readonly repo: AdminSectionRepository,
    private readonly auditService: AuditService,
    private readonly scopeResolverService: ScopeResolverService,
  ) {}

  async get(ctx: AuthContext, employeeId: number): Promise<EmployeeAdminSection | null> {
    const canAccess = await this.scopeResolverService.canAccessAdminSection(ctx, employeeId);
    if (!canAccess) throw new ForbiddenException();
    return this.repo.findByEmployee(employeeId, ctx.tenantId);
  }

  async upsert(ctx: AuthContext, employeeId: number, dto: UpdateAdminSectionDto): Promise<EmployeeAdminSection> {
    const canEdit = await this.scopeResolverService.canEditAdminSection(ctx, employeeId);
    if (!canEdit) throw new ForbiddenException();

    const isNew = (await this.repo.findByEmployee(employeeId, ctx.tenantId)) === null;

    const record = await this.repo.upsert(employeeId, ctx.tenantId, {
      evaluation: dto.evaluation ?? null,
      grade: dto.grade ?? null,
      joiningReason: dto.joiningReason ?? null,
      employmentCategory: dto.employmentCategory ?? null,
      salaryBand: dto.salaryBand ?? null,
      specialNotes: dto.specialNotes ?? null,
      updatedBy: ctx.userAccountId,
    });

    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'EmployeeAdminSection',
      entityId: record.id,
      actionType: isNew ? 'CREATE' : 'UPDATE',
      changedByEmployeeId: ctx.employeeId,
    });

    return record;
  }
}
