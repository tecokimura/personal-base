import { IsOptional, IsString } from 'class-validator';

export class AssistUpdateProfileDto {
  @IsOptional()
  @IsString()
  profileFreeText?: string;
}
