import { Injectable, Logger } from '@nestjs/common';
import type { WhatsAppProvider } from '../whatsapp-provider.interface';

/** Logs messages instead of sending. Used when WHATSAPP_ENABLED=false. */
@Injectable()
export class MockWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MockWhatsAppProvider.name);

  async sendText(to: string, body: string): Promise<void> {
    this.logger.log(`[WhatsApp MOCK] → ${to}: ${body.replace(/\n/g, ' | ')}`);
  }
}
