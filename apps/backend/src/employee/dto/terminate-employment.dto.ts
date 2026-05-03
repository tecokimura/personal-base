import { IsDateString } from 'class-validator';

export class TerminateEmploymentDto {
  @IsDateString()
  endDate!: string;
}
