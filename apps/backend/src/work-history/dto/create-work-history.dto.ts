import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class CreateWorkHistoryDto {
  @IsString()
  @Matches(YEAR_MONTH_PATTERN, { message: 'yearMonthFrom must be YYYY-MM format' })
  yearMonthFrom!: string;

  @IsOptional()
  @IsString()
  @Matches(YEAR_MONTH_PATTERN, { message: 'yearMonthTo must be YYYY-MM format' })
  yearMonthTo?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsString()
  @MinLength(1)
  workSummary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  toolsUsed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  roleName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  teamSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectCode?: string;
}
