export class AssignRoleDto {
  targetUserAccountId!: number;
  roleType!: number;
  scopeType!: number;
  scopeId!: number;
  effectiveFrom!: string;
  effectiveTo?: string;
}
