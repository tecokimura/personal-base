import { IsString, IsNotEmpty, IsOptional, IsInt, IsPositive, MaxLength, Min } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  organizationName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizationCode?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  parentOrganizationId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
