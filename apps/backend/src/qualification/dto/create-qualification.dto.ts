import { IsString, IsOptional, IsDateString, MaxLength, MinLength } from 'class-validator';

export class CreateQualificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsDateString()
  acquiredDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
