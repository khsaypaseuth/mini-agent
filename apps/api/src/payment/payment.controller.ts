import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-invoice')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a PhaJay payment invoice + QR for a request' })
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: User) {
    return this.paymentService.createInvoice(dto.requestId, user.id);
  }

  @Get(':requestId/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for a request' })
  getStatus(@Param('requestId') requestId: string) {
    return this.paymentService.getStatus(requestId);
  }

  /**
   * Sandbox-only manual confirmation. In production the PhaJay socket
   * listener drives confirmation; this endpoint lets staff/admin simulate
   * a completed payment while PHAPAY_ENABLED=false.
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '[Sandbox] Manually confirm a payment by billNumber' })
  async confirm(@Body() dto: ConfirmPaymentDto) {
    await this.paymentService.confirmPayment({
      billNumber: dto.billNumber,
      transactionId: dto.transactionId ?? dto.billNumber,
      paymentMethod: dto.paymentMethod ?? 'MOCK',
      txnAmount: dto.txnAmount ?? 0,
      status: dto.status ?? 'PAYMENT_COMPLETED',
    });
    return { message: 'Confirmation processed' };
  }
}
