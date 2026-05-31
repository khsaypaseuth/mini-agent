import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CreateQrParams,
  CreateQrResult,
  PaymentConfirmation,
  PaymentProvider,
} from '../payment-provider.interface';

/**
 * Mock provider used when PHAPAY_ENABLED is false (local dev, CI, tests).
 * Generates a fake billNumber so the full flow can be exercised without
 * touching the real gateway. Confirmation is triggered manually via the
 * sandbox endpoint POST /payments/confirm.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);

  async createQr(params: CreateQrParams): Promise<CreateQrResult> {
    const billNumber = randomUUID();
    this.logger.log(`[MOCK QR] amount=${params.amount} billNumber=${billNumber}`);
    return {
      billNumber,
      refNo: String(Math.floor(Math.random() * 1_000_000_000)),
      qrData: `mock-qr://${billNumber}`,
      raw: { mock: true, amount: params.amount, billNumber },
    };
  }

  parseConfirmation(raw: Record<string, unknown>): PaymentConfirmation {
    return {
      billNumber: String(raw['billNumber'] ?? raw['transactionId'] ?? ''),
      transactionId: String(raw['transactionId'] ?? raw['billNumber'] ?? ''),
      paymentMethod: String(raw['paymentMethod'] ?? 'MOCK'),
      txnAmount: Number(raw['txnAmount'] ?? 0),
      status: String(raw['status'] ?? 'PAYMENT_COMPLETED'),
      raw,
    };
  }
}
