import {
  IsInt,
  IsIn,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

const VALID_EMPLOYMENT_TYPES = [1, 2, 3, 4, 5] as const;

export class UpdateEmploymentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  organizationId?: number;

  @IsOptional()
  @IsInt()
  @IsIn(VALID_EMPLOYMENT_TYPES)
  employmentType?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  positionMasterId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  supervisorEmployeeId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}
