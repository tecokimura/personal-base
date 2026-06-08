import { IsString, IsOptional, IsDateString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateQualificationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsDateString()
  acquiredDate?: string;

  @IsOptional()
  @ValidateIf((o) => o.note !== null)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
