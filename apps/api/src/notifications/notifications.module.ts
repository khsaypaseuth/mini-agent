import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { MockWhatsAppProvider } from './providers/mock-whatsapp.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { WHATSAPP_PROVIDER } from './whatsapp-provider.interface';

@Global()
@Module({
  providers: [
    NotificationsService,
    WhatsAppCloudProvider,
    MockWhatsAppProvider,
    {
      provide: WHATSAPP_PROVIDER,
      inject: [ConfigService, WhatsAppCloudProvider, MockWhatsAppProvider],
      useFactory: (
        config: ConfigService,
        cloud: WhatsAppCloudProvider,
        mock: MockWhatsAppProvider,
      ) => (config.get<string>('WHATSAPP_ENABLED') === 'true' ? cloud : mock),
    },
  ],
  exports: [NotificationsService, WHATSAPP_PROVIDER],
})
export class NotificationsModule {}
