import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from 'class-validator';

export class CompleteDeliveryDto {
  @ApiProperty({ description: 'File ID of the proof photo (from POST /files, kind=proof)' })
  @IsString()
  proofFileId!: string;

  @ApiPropertyOptional({ example: 17.9757 })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  proofLat?: number;

  @ApiPropertyOptional({ example: 102.6331 })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  proofLng?: number;
}
