import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RequestStatus } from '@mini-agent/types';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly notifications: NotificationsService,
    private readonly files: FilesService,
    private readonly qr: QrService,
    private readonly config: ConfigService,
  ) {}

  // ─── Public interface ──────────────────────────────────────────────────

  /** Back-office staff uploads the finished certificate file for a request. */
  async upload(requestId: string, fileId: string, actorId: string) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);

    const existing = await this.prisma.certificate.findUnique({ where: { requestId } });
    if (existing) throw new ConflictException('Certificate already uploaded for this request');

    const downloadToken = randomBytes(16).toString('hex');
    const certificate = await this.prisma.certificate.create({
      data: { requestId, fileId, downloadToken },
    });

    await this.requests.updateStatus(requestId, RequestStatus.CERTIFICATE_UPLOADED, actorId);
    await this.notifications.notifyStatusChange(
      request.customerId,
      request.requestNumber,
      RequestStatus.CERTIFICATE_UPLOADED,
    );

    this.logger.log(`Certificate uploaded for ${request.requestNumber}`);
    return certificate;
  }

  /** Public download page data — no auth, accessed by unguessable token. */
  async getByDownloadToken(downloadToken: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { downloadToken },
      include: {
        file: true,
        request: { select: { requestNumber: true, service: { select: { name: true } } } },
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    const downloadUrl = await this.files.getDownloadUrl(cert.file);

    return {
      requestNumber: cert.request.requestNumber,
      service: cert.request.service.name,
      mime: cert.file.mime,
      downloadUrl,
      // brand info for the download page (contact / refer-a-friend live on the web-app)
      brand: 'MiniAgent',
    };
  }

  /** 100×100 QR label that links to the public download page. */
  async getQrLabel(requestId: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { requestId } });
    if (!cert) throw new NotFoundException('No certificate for this request');

    const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3002';
    const downloadPageUrl = `${webAppUrl}/cert/${cert.downloadToken}`;
    const qrDataUrl = await this.qr.certLabelDataUrl(downloadPageUrl);

    return { downloadPageUrl, qrDataUrl };
  }
}
