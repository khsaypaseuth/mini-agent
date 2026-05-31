import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@mini-agent/types';

const STAFF_ROLES = [
  UserRole.BACK_OFFICE_STAFF,
  UserRole.MAIN_OFFICE_STAFF,
  UserRole.DELIVERY_MAN,
  UserRole.MANAGER,
] as const;

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'staff@miniagent.la' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
