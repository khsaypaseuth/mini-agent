import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestsModule } from '../requests/requests.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { PhapaySocketListener } from './phapay-socket.listener';
import { MockPaymentProvider } from './providers/mock.provider';
import { PhapayProvider } from './providers/phapay.provider';

@Module({
  imports: [RequestsModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PhapaySocketListener,
    PhapayProvider,
    MockPaymentProvider,
    {
      // Select real vs mock provider at runtime based on PHAPAY_ENABLED.
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, PhapayProvider, MockPaymentProvider],
      useFactory: (config: ConfigService, phapay: PhapayProvider, mock: MockPaymentProvider) =>
        config.get<string>('PHAPAY_ENABLED') === 'true' ? phapay : mock,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
