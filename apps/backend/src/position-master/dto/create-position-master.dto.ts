import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreatePositionMasterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
