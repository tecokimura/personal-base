import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evaluation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  grade?: string | null;

  @IsOptional()
  @IsString()
  joiningReason?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  employmentCategory?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salaryBand?: string | null;

  @IsOptional()
  @IsString()
  specialNotes?: string | null;
}
