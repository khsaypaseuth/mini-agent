import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AddTextInputDto {
  @ApiProperty({ example: 'checkpoint' })
  @IsString()
  requirementKey!: string;

  @ApiProperty({ example: 'nongkhai' })
  @IsString()
  textValue!: string;
}

export class AddFileInputDto {
  @ApiProperty({ example: 'passport_photo' })
  @IsString()
  requirementKey!: string;

  @ApiProperty({ description: 'File ID returned from POST /files' })
  @IsString()
  fileId!: string;
}

export class AddPassengerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'File ID of passport scan' })
  @IsOptional()
  @IsString()
  passportFileId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  dateIn?: string;

  @ApiPropertyOptional({ example: '2026-06-07' })
  @IsOptional()
  @IsString()
  dateOut?: string;

  @ApiPropertyOptional({ example: 'nongkhai' })
  @IsOptional()
  @IsString()
  checkpoint?: string;

  @ApiPropertyOptional({ example: '1A-1234' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional({ example: 'TG401' })
  @IsOptional()
  @IsString()
  flightNo?: string;

  @ApiPropertyOptional({ example: 'Bangkok' })
  @IsOptional()
  @IsString()
  arrivalPoint?: string;

  @ApiPropertyOptional({ example: 'Novotel Bangkok' })
  @IsOptional()
  @IsString()
  stayLocation?: string;
}
