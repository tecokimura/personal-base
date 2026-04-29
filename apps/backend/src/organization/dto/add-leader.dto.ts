import { IsInt, IsPositive, IsIn, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class AddLeaderDto {
  @IsInt()
  @IsPositive()
  employeeId!: number;

  // leaderType: 1=部門長, 2=副部門長
  @IsInt()
  @IsIn([1, 2])
  leaderType!: number;

  @IsOptional()
  @IsBoolean()
  isPrimaryLeader?: boolean;

  @IsDateString()
  startDate!: string; // ISO date string (yyyy-MM-dd)
}
