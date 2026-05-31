import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type {
  CreateQrParams,
  CreateQrResult,
  PaymentConfirmation,
  PaymentProvider,
} from '../payment-provider.interface';

/**
 * Real PhaJay provider.
 * Docs: https://payment-doc.phajay.co/v1/connect-payment-QR/generateQR
 * - Header `secretKey` (or `testKey` before KYC) carries the merchant key.
 * - BCEL descriptions must be ASCII (no Lao/Thai), so we sanitise.
 */
@Injectable()
export class PhapayProvider implements PaymentProvider {
  private readonly logger = new Logger(PhapayProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createQr(params: CreateQrParams): Promise<CreateQrResult> {
    const url = this.config.getOrThrow<string>('PHAPAY_GENERATE_QR_URL');
    const secretKey = this.config.getOrThrow<string>('PHAPAY_SECRET_KEY');
    const useTestKey = this.config.get<string>('PHAPAY_USE_TEST_KEY') === 'true';
    const headerName = useTestKey ? 'testKey' : 'secretKey';

    const { data } = await axios.post(
      url,
      { amount: params.amount, description: this.sanitiseDescription(params.description) },
      { headers: { [headerName]: secretKey, 'Content-Type': 'application/json' } },
    );

    return {
      billNumber: String(data.billNumber ?? data.transactionId ?? ''),
      refNo: String(data.refNo ?? ''),
      qrData: data.qrCode ?? data.qr ?? data.qrData,
      raw: data,
    };
  }

  parseConfirmation(raw: Record<string, unknown>): PaymentConfirmation {
    return {
      billNumber: String(raw['billNumber'] ?? raw['transactionId'] ?? ''),
      transactionId: String(raw['transactionId'] ?? ''),
      paymentMethod: String(raw['paymentMethod'] ?? ''),
      txnAmount: Number(raw['txnAmount'] ?? 0),
      status: String(raw['status'] ?? ''),
      raw,
    };
  }

  /** BCEL does not accept Lao/Thai characters in the description field. */
  private sanitiseDescription(desc: string): string {
    // eslint-disable-next-line no-control-regex
    return desc.replace(/[^\x00-\x7F]/g, '').trim() || 'MiniAgent payment';
  }
}
