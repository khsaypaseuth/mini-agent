import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class WalletAmountDto {
  @ApiProperty({ example: 80000, description: 'Amount in LAK' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Reference note (e.g. barcode/topup ref)' })
  @IsOptional()
  @IsString()
  ref?: string;
}
