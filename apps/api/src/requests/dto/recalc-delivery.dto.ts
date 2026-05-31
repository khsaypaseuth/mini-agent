import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class RecalcDeliveryDto {
  @ApiProperty({ example: 17.9757 })
  @IsNumber()
  @IsLatitude()
  gpsLat!: number;

  @ApiProperty({ example: 102.6331 })
  @IsNumber()
  @IsLongitude()
  gpsLng!: number;
}
