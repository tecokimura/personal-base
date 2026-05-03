import { IsInt, IsOptional } from 'class-validator';

export class SetManagerEmployeeDto {
  @IsOptional()
  @IsInt()
  managerEmployeeId!: number | null;
}
