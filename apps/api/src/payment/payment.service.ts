import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentStatus, RequestStatus } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';

const COMPLETED_STATUS = 'PAYMENT_COMPLETED';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly requests: RequestsService,
  ) {}

  // ─── Public interface ──────────────────────────────────────────────────

  /**
   * Idempotent: one payment per request (Payment.requestId is unique).
   * A second call returns the existing pending payment without a new QR.
   */
  async createInvoice(requestId: string, actorId: string) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);

    const existing = await this.prisma.payment.findUnique({ where: { requestId } });
    if (existing && existing.status === PaymentStatus.PENDING) {
      return this.toInvoice(existing);
    }
    if (existing && existing.status === PaymentStatus.PAID) {
      throw new BadRequestException('Request is already paid');
    }

    if (request.totalAmount === null) {
      throw new BadRequestException('Request has no total amount — cannot invoice');
    }
    const amount = Number(request.totalAmount);

    const qr = await this.provider.createQr({
      amount,
      description: request.requestNumber,
    });

    const payment = await this.prisma.payment.create({
      data: {
        requestId,
        provider: 'phapay',
        providerRef: qr.billNumber,
        amount: request.totalAmount,
        currency: request.currency,
        status: PaymentStatus.PENDING,
        rawWebhook: qr.raw as Prisma.InputJsonValue,
      },
    });

    // Move request into AWAITING_PAYMENT (only valid from SUBMITTED)
    if (request.status === RequestStatus.SUBMITTED) {
      await this.requests.updateStatus(requestId, RequestStatus.AWAITING_PAYMENT, actorId);
    }

    return { ...this.toInvoice(payment), qrData: qr.qrData };
  }

  /**
   * Idempotent confirmation handler. Called by the PhaJay socket listener
   * (real) or the sandbox confirm endpoint (mock). Matches by billNumber.
   */
  async confirmPayment(raw: Record<string, unknown>): Promise<void> {
    const confirmation = this.provider.parseConfirmation(raw);

    if (confirmation.status !== COMPLETED_STATUS) {
      this.logger.warn(`Ignoring confirmation with status=${confirmation.status}`);
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: confirmation.billNumber },
    });
    if (!payment) {
      this.logger.warn(`No payment found for billNumber=${confirmation.billNumber}`);
      return;
    }
    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(`Payment ${payment.id} already confirmed — skipping (idempotent)`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerRef: confirmation.transactionId,
        rawWebhook: raw as Prisma.InputJsonValue,
      },
    });

    await this.requests.updateStatus(payment.requestId, RequestStatus.PAID, null);

    await this.prisma.auditLog.create({
      data: {
        action: 'payment.confirmed',
        entity: 'payment',
        entityId: payment.id,
        meta: {
          transactionId: confirmation.transactionId,
          paymentMethod: confirmation.paymentMethod,
          txnAmount: confirmation.txnAmount,
        },
      },
    });

    this.logger.log(`Payment ${payment.id} confirmed via ${confirmation.paymentMethod}`);
  }

  async getStatus(requestId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { requestId } });
    if (!payment) throw new NotFoundException('No payment for this request');
    return this.toInvoice(payment);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private toInvoice(payment: {
    id: string;
    requestId: string;
    providerRef: string | null;
    amount: unknown;
    currency: string;
    status: string;
  }): {
    paymentId: string;
    requestId: string;
    billNumber: string | null;
    amount: number;
    currency: string;
    status: string;
    qrData?: string;
  } {
    return {
      paymentId: payment.id,
      requestId: payment.requestId,
      billNumber: payment.providerRef,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
    };
  }
}
