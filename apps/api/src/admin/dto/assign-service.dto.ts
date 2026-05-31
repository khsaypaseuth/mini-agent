import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignServiceDto {
  @ApiProperty({ description: 'Staff user ID' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Service ID to assign' })
  @IsString()
  serviceId!: string;
}
