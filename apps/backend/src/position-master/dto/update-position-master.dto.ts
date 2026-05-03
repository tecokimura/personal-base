import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdatePositionMasterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
