import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssistUpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  profileFreeText?: string;
}
