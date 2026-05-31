import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io, type Socket } from 'socket.io-client';
import { PaymentService } from './payment.service';

/**
 * Connects to the PhaJay payment gateway as a socket client and subscribes to
 * the `join::<secretKey>` event. Each emitted payload is a payment
 * confirmation, which we hand to PaymentService.confirmPayment (idempotent).
 *
 * Only active when PHAPAY_ENABLED=true; otherwise the mock provider + the
 * sandbox /payments/confirm endpoint drive confirmations during local dev.
 */
@Injectable()
export class PhapaySocketListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhapaySocketListener.name);
  private socket?: Socket;

  constructor(
    private readonly config: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('PHAPAY_ENABLED') !== 'true') {
      this.logger.log('PhaJay disabled — socket listener not started (using mock provider)');
      return;
    }

    const url = this.config.getOrThrow<string>('PHAPAY_SOCKET_URL');
    const secretKey = this.config.getOrThrow<string>('PHAPAY_SECRET_KEY');

    this.socket = io(url, { transports: ['websocket'], reconnection: true });

    this.socket.on('connect', () => {
      this.logger.log('Connected to PhaJay payment gateway');
      this.socket?.on(`join::${secretKey}`, (data: Record<string, unknown>) => {
        this.logger.log(`Payment event received: ${JSON.stringify(data)}`);
        this.paymentService
          .confirmPayment(data)
          .catch((err) => this.logger.error(`confirmPayment failed: ${err}`));
      });
    });

    this.socket.on('connect_error', (err) => {
      this.logger.error(`PhaJay socket connection failed: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.socket?.disconnect();
  }
}
