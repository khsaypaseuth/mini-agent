import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RequestStatus } from '@mini-agent/types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';

export interface DeliveryProof {
  proofFileId: string;
  proofLat?: number;
  proofLng?: number;
}

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Public interface ──────────────────────────────────────────────────

  /** Delivery person scans the QR at the office to confirm pickup. */
  async scanPickup(requestId: string, deliveryManId: string) {
    await this.loadRequest(requestId);
    const now = new Date();

    await this.prisma.delivery.upsert({
      where: { requestId },
      create: { requestId, deliveryManId, pickedUpAt: now },
      update: { deliveryManId, pickedUpAt: now },
    });

    // READY_FOR_DELIVERY → PICKED_UP (state machine enforces validity)
    await this.requests.updateStatus(requestId, RequestStatus.PICKED_UP, deliveryManId);
    this.logger.log(`Pickup confirmed for ${requestId} by ${deliveryManId}`);
    return { requestId, status: RequestStatus.PICKED_UP };
  }

  /** Delivery person marks the parcel as on its way; customer is notified. */
  async markInTransit(requestId: string, deliveryManId: string) {
    const request = await this.loadRequest(requestId);

    await this.prisma.delivery.update({
      where: { requestId },
      data: { inTransitAt: new Date() },
    });

    await this.requests.updateStatus(requestId, RequestStatus.IN_TRANSIT, deliveryManId);
    await this.notifications.notifyStatusChange(
      request.customerId,
      request.requestNumber,
      RequestStatus.IN_TRANSIT,
    );
    return { requestId, status: RequestStatus.IN_TRANSIT };
  }

  /** Delivery person delivers, scans + uploads a proof photo (+ GPS). */
  async completeDelivery(requestId: string, deliveryManId: string, proof: DeliveryProof) {
    const request = await this.loadRequest(requestId);

    await this.prisma.delivery.update({
      where: { requestId },
      data: {
        deliveredAt: new Date(),
        proofFileId: proof.proofFileId,
        proofLat: proof.proofLat ?? null,
        proofLng: proof.proofLng ?? null,
      },
    });

    await this.requests.updateStatus(requestId, RequestStatus.DELIVERED, deliveryManId);
    await this.notifications.notifyStatusChange(
      request.customerId,
      request.requestNumber,
      RequestStatus.DELIVERED,
    );
    // No further action after delivery → close the request out.
    await this.requests.updateStatus(requestId, RequestStatus.COMPLETED, deliveryManId);

    this.logger.log(`Delivered ${request.requestNumber} with proof ${proof.proofFileId}`);
    return { requestId, status: RequestStatus.COMPLETED };
  }

  /** Delivery person's queue: available pickups + their own active deliveries. */
  async getQueue(deliveryManId: string) {
    return this.prisma.request.findMany({
      where: {
        OR: [
          { status: RequestStatus.READY_FOR_DELIVERY },
          {
            status: { in: [RequestStatus.PICKED_UP, RequestStatus.IN_TRANSIT] },
            delivery: { deliveryManId },
          },
        ],
      },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { slug: true, name: true } },
        delivery: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async loadRequest(requestId: string) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);
    return request;
  }
}
