import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { WhatsAppProvider } from '../whatsapp-provider.interface';

/**
 * Real WhatsApp Cloud API provider.
 * POST https://graph.facebook.com/{version}/{phoneNumberId}/messages
 */
@Injectable()
export class WhatsAppCloudProvider implements WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppCloudProvider.name);

  constructor(private readonly config: ConfigService) {}

  async sendText(to: string, body: string): Promise<void> {
    const token = this.config.getOrThrow<string>('WHATSAPP_TOKEN');
    const phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    const version = this.config.get<string>('WHATSAPP_API_VERSION') ?? 'v21.0';
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body },
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      this.logger.error(`WhatsApp send failed to ${to}: ${(err as Error).message}`);
    }
  }
}
