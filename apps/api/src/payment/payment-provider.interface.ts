/**
 * Thin payment-provider abstraction so PhaJay is swappable and testable.
 * Implementations: PhapayProvider (real), MockPaymentProvider (dev/test).
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreateQrParams {
  amount: number;
  description: string;
}

export interface CreateQrResult {
  /** Bank/system bill number — the key we match the confirmation against. */
  billNumber: string;
  /** Provider reference number. */
  refNo: string;
  /** QR payload / image data the customer scans (provider-specific). */
  qrData?: string;
  /** Raw provider response, stored for audit. */
  raw: Record<string, unknown>;
}

/**
 * Normalised payment confirmation. PhaJay guarantees paymentMethod,
 * transactionId and txnAmount across all banks; other fields vary.
 */
export interface PaymentConfirmation {
  billNumber: string;
  transactionId: string;
  paymentMethod: string;
  txnAmount: number;
  status: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  /** Create a payment QR for the given amount. */
  createQr(params: CreateQrParams): Promise<CreateQrResult>;
  /** Normalise a raw provider payload into a PaymentConfirmation. */
  parseConfirmation(raw: Record<string, unknown>): PaymentConfirmation;
}
