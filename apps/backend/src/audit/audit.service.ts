import { Injectable, Logger } from '@nestjs/common';
import { LoginHistory, EditHistory } from '@prisma/client';
import {
  AuditRepository,
  CreateLoginHistoryInput,
  CreateEditHistoryInput,
  EditHistoryWithTarget,
} from './audit.repository';
import { AuditEventDto } from './dto/audit-event.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  async logLogin(data: CreateLoginHistoryInput): Promise<void> {
    try {
      await this.repo.createLoginHistory(data);
    } catch (err) {
      this.logger.error('Failed to record login history', err);
    }
  }

  async logEdit(data: CreateEditHistoryInput): Promise<void> {
    try {
      await this.repo.createEditHistory(data);
    } catch (err) {
      this.logger.error('Failed to record edit history', err);
    }
  }

  async listLoginHistory(tenantId: number): Promise<LoginHistory[]> {
    return this.repo.findLoginHistoryByTenant(tenantId);
  }

  async listEditHistory(tenantId: number): Promise<EditHistory[]> {
    return this.repo.findEditHistoryByTenant(tenantId);
  }

  async listEvents(tenantId: number): Promise<AuditEventDto[]> {
    const [loginHistory, editHistory] = await Promise.all([
      this.repo.findLoginHistoryByTenant(tenantId),
      this.repo.findEditHistoryWithTargetByTenant(tenantId),
    ]);

    const loginEvents: AuditEventDto[] = loginHistory.map((h) => ({
      eventType: 'LOGIN',
      occurredAt: h.loggedInAt,
      actorEmployeeId: h.employeeId,
      targetEmployeeId: h.employeeId,
      targetType: null,
      operationType: 'LOGIN',
    }));

    const editEvents: AuditEventDto[] = (editHistory as EditHistoryWithTarget[]).map((h) => ({
      eventType: 'EDIT',
      occurredAt: h.changedAt,
      actorEmployeeId: h.changedByEmployeeId,
      targetEmployeeId: h.resolvedEmployeeId,
      targetType: h.entityType,
      operationType: h.actionType,
    }));

    return [...loginEvents, ...editEvents].sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
  }
}
