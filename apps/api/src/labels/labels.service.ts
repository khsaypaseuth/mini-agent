import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestStatus } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { RequestsService } from '../requests/requests.service';

export interface LabelPrintData {
  requestNumber: string;
  customerName: string;
  customerPhone: string | null;
  status: string;
  service: unknown;
  qrPayload: string;
  qrDataUrl: string;
  gpsMapUrl: string | null;
  createdAt: Date;
}

@Injectable()
export class LabelsService {
  private readonly logger = new Logger(LabelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly qr: QrService,
    private readonly config: ConfigService,
  ) {}

  // ─── Public interface ──────────────────────────────────────────────────

  /** Main-office staff generates the printable label + QR for a request. */
  async generate(requestId: string, actorId: string): Promise<LabelPrintData> {
    const request = await this.loadRequest(requestId);

    const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3002';
    const qrPayload = `${webAppUrl}/track/${request.publicToken}`;

    const label = await this.prisma.label.upsert({
      where: { requestId },
      create: { requestId, qrPayload },
      update: { qrPayload },
    });

    // Pack + label printed → ready for delivery pickup (physical flow only).
    if (request.status === RequestStatus.CERTIFICATE_UPLOADED) {
      await this.requests.updateStatus(requestId, RequestStatus.READY_FOR_DELIVERY, actorId);
    }

    return this.buildPrintData(request, label.qrPayload);
  }

  async getLabel(requestId: string): Promise<LabelPrintData> {
    const label = await this.prisma.label.findUnique({ where: { requestId } });
    if (!label) throw new NotFoundException('No label for this request');
    const request = await this.loadRequest(requestId);
    return this.buildPrintData(request, label.qrPayload);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async loadRequest(requestId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
      },
    });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);
    return request;
  }

  private async buildPrintData(
    request: {
      requestNumber: string;
      status: string;
      createdAt: Date;
      gpsLat: unknown;
      gpsLng: unknown;
      customer: { name: string; phone: string | null };
      service: { name: unknown };
    },
    qrPayload: string,
  ): Promise<LabelPrintData> {
    const qrDataUrl = await this.qr.toDataUrl(qrPayload);
    const gpsMapUrl =
      request.gpsLat !== null && request.gpsLng !== null
        ? `https://www.google.com/maps/search/?api=1&query=${request.gpsLat},${request.gpsLng}`
        : null;

    return {
      requestNumber: request.requestNumber,
      customerName: request.customer.name,
      customerPhone: request.customer.phone,
      status: request.status,
      service: request.service.name,
      qrPayload,
      qrDataUrl,
      gpsMapUrl,
      createdAt: request.createdAt,
    };
  }
}
