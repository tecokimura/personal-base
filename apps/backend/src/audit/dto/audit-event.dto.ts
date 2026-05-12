export interface AuditEventDto {
  eventType: 'LOGIN' | 'EDIT';
  occurredAt: Date;
  actorEmployeeId: number;
  targetEmployeeId: number | null;
  targetType: string | null;
  operationType: string;
}
