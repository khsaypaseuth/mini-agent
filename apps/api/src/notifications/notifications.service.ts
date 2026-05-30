import { Injectable, Logger } from '@nestjs/common';
import type { OtpChannel, RequestStatus } from '@mini-agent/types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** Phase 1: mock — logs to console. Phase 7: WhatsApp Cloud API. */
  async sendOtp(channel: OtpChannel, contact: string, code: string): Promise<void> {
    this.logger.log(`[OTP MOCK] channel=${channel} to=${contact} code=${code}`);
  }

  /** Phase 7: real WhatsApp/email notifications on status changes. */
  async notifyStatusChange(
    userId: string,
    requestNumber: string,
    status: RequestStatus,
  ): Promise<void> {
    this.logger.log(
      `[NOTIFY MOCK] userId=${userId} request=${requestNumber} status=${status}`,
    );
  }
}
