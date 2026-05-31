import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { DeliveryType, RequestChannel } from '@mini-agent/types';

export class CreateRequestDto {
  @ApiProperty({ description: 'Service ID' })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Selected pricing option ID' })
  @IsOptional()
  @IsString()
  pricingOptionId?: string;

  @ApiProperty({ enum: DeliveryType, default: DeliveryType.PHYSICAL })
  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @ApiProperty({ enum: RequestChannel, default: RequestChannel.WEB })
  @IsEnum(RequestChannel)
  channel: RequestChannel = RequestChannel.WEB;

  @ApiPropertyOptional({ example: 17.9757, description: 'Required for physical delivery' })
  @ValidateIf((o: CreateRequestDto) => o.deliveryType === DeliveryType.PHYSICAL || o.deliveryType === DeliveryType.BOTH)
  @IsNumber()
  @IsLatitude()
  gpsLat?: number;

  @ApiPropertyOptional({ example: 102.6331 })
  @ValidateIf((o: CreateRequestDto) => o.deliveryType === DeliveryType.PHYSICAL || o.deliveryType === DeliveryType.BOTH)
  @IsNumber()
  @IsLongitude()
  gpsLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Number of passengers (for per-person priced services)' })
  @IsOptional()
  @IsNumber()
  passengerCount?: number;

  @ApiPropertyOptional({ description: 'Vehicle type key (for insurance pricing)', example: 'sedan' })
  @IsOptional()
  @IsString()
  vehicleType?: string;
}
