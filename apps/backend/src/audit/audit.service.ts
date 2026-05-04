import { Injectable, Logger } from '@nestjs/common';
import { LoginHistory, EditHistory } from '@prisma/client';
import {
  AuditRepository,
  CreateLoginHistoryInput,
  CreateEditHistoryInput,
} from './audit.repository';

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
}
