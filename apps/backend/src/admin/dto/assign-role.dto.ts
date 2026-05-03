import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ScopeType } from '../../authorization/constants';

// scopeId = 0 for SELF/TENANT_ALL; positive int for ORGANIZATION/ORGANIZATION_TREE
function IsScopeIdValid(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isScopeIdValid',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as { scopeType?: number };
          if (typeof value !== 'number' || !Number.isInteger(value)) return false;
          const st = dto.scopeType;
          if (st === ScopeType.SELF || st === ScopeType.TENANT_ALL) return value === 0;
          if (st === ScopeType.ORGANIZATION || st === ScopeType.ORGANIZATION_TREE) return value > 0;
          return value >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          const dto = args.object as { scopeType?: number };
          const st = dto.scopeType;
          if (st === ScopeType.SELF || st === ScopeType.TENANT_ALL) {
            return 'scopeId must be 0 for SELF or TENANT_ALL scope';
          }
          return 'scopeId must be a positive integer for ORGANIZATION or ORGANIZATION_TREE scope';
        },
      },
    });
  };
}

const VALID_ROLE_TYPES = [1, 2, 3, 4, 5] as const;
const VALID_SCOPE_TYPES = [1, 2, 3, 4] as const;

export class AssignRoleDto {
  @IsInt()
  @IsPositive()
  targetUserAccountId!: number;

  @IsInt()
  @IsIn(VALID_ROLE_TYPES)
  roleType!: number;

  @IsInt()
  @IsIn(VALID_SCOPE_TYPES)
  scopeType!: number;

  @IsInt()
  @IsScopeIdValid()
  scopeId!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
