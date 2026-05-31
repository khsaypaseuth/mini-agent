import { Inject, Injectable, Logger } from '@nestjs/common';
import { OtpChannel, type RequestStatus } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import { otpMessage, statusMessage } from './messages';
import { WHATSAPP_PROVIDER, type WhatsAppProvider } from './whatsapp-provider.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  /** Send an OTP. WhatsApp channel goes through the provider; email is logged (Phase 9). */
  async sendOtp(channel: OtpChannel, contact: string, code: string, locale = 'lo'): Promise<void> {
    if (channel === OtpChannel.WHATSAPP) {
      await this.whatsapp.sendText(contact, otpMessage(channel, code, locale));
      return;
    }
    this.logger.log(`[OTP/email] to=${contact} code=${code}`);
  }

  /** Notify the customer on key status transitions via WhatsApp. */
  async notifyStatusChange(
    userId: string,
    requestNumber: string,
    status: RequestStatus,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, locale: true },
    });
    if (!user?.phone) return; // nothing to notify on (no phone on file)

    const message = statusMessage(status, requestNumber, user.locale);
    if (!message) return; // not a notify-worthy status

    await this.whatsapp.sendText(user.phone, message);
  }
}
