import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Request ID to invoice' })
  @IsString()
  requestId!: string;
}
