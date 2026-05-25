import {
  IsInt,
  IsIn,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

// employmentType: 1=正社員, 2=契約社員, 3=パートタイム, 4=派遣, 5=業務委託
const VALID_EMPLOYMENT_TYPES = [1, 2, 3, 4, 5] as const;

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
  @IsDateString()
  endDate?: string;
}
