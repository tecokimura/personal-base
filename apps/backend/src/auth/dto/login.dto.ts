import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class LoginDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  loginIdentifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}
