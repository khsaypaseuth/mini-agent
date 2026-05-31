import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Sandbox confirmation payload — mirrors the PhaJay socket data shape so the
 * full PAID flow can be exercised without the real gateway.
 */
export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Bill number returned by generateQR' })
  @IsString()
  billNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ example: 'BCEL' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 400000 })
  @IsOptional()
  @IsNumber()
  txnAmount?: number;

  @ApiPropertyOptional({ default: 'PAYMENT_COMPLETED' })
  @IsOptional()
  @IsString()
  status?: string;
}
