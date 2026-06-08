import { IsString, IsOptional, IsDateString, MaxLength, MinLength } from 'class-validator';

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
  @IsString()
  @MaxLength(500)
  note?: string;
}
