import { IsInt, IsOptional } from 'class-validator';

export class SetSupervisorEmployeeDto {
  @IsOptional()
  @IsInt()
  supervisorEmployeeId!: number | null;
}
