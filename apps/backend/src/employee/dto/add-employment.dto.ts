import {
  IsInt,
  IsIn,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

// employmentType: 1=正社員, 2=契約社員, 3=パートタイム, 4=派遣, 5=業務委託
const VALID_EMPLOYMENT_TYPES = [1, 2, 3, 4, 5] as const;

// status: 1=在職, 2=休職 (退職/削除は所属追加時には使わない)
const VALID_INITIAL_STATUSES = [1, 2] as const;

export class AddEmploymentDto {
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsInt()
  @IsIn(VALID_EMPLOYMENT_TYPES)
  employmentType!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  positionMasterId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  supervisorEmployeeId?: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsInt()
  @IsIn(VALID_INITIAL_STATUSES)
  status?: number;
}
