import { IsDateString } from 'class-validator';

export class TerminateLeaderDto {
  @IsDateString()
  endDate!: string; // ISO date string (yyyy-MM-dd)
}
