import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RequestStatus } from '@mini-agent/types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { DeliveriesService } from './deliveries.service';

const baseRequest = {
  id: 'req-1',
  requestNumber: 'REQ-1',
  customerId: 'cust-1',
  status: RequestStatus.READY_FOR_DELIVERY,
};

function makePrismaMock() {
  return {
    request: { findUnique: jest.fn(), findMany: jest.fn() },
    delivery: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  };
}

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let requests: { updateStatus: jest.Mock };
  let notifications: { notifyStatusChange: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    requests = { updateStatus: jest.fn().mockResolvedValue({}) };
    notifications = { notifyStatusChange: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RequestsService, useValue: requests },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(DeliveriesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── scanPickup ──────────────────────────────────────────────────────

  describe('scanPickup', () => {
    it('records pickup and transitions READY_FOR_DELIVERY → PICKED_UP', async () => {
      prisma.request.findUnique.mockResolvedValue(baseRequest);
      prisma.delivery.upsert.mockResolvedValue({ id: 'del-1', pickedUpAt: new Date() });

      await service.scanPickup('req-1', 'driver-1');

      expect(prisma.delivery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            deliveryManId: 'driver-1',
            pickedUpAt: expect.any(Date),
          }),
        }),
      );
      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.PICKED_UP,
        'driver-1',
      );
    });

    it('throws NotFoundException when request missing', async () => {
      prisma.request.findUnique.mockResolvedValue(null);
      await expect(service.scanPickup('bad', 'driver-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── markInTransit ───────────────────────────────────────────────────

  describe('markInTransit', () => {
    it('sets inTransitAt, transitions PICKED_UP → IN_TRANSIT and notifies customer', async () => {
      prisma.request.findUnique.mockResolvedValue({
        ...baseRequest,
        status: RequestStatus.PICKED_UP,
      });
      prisma.delivery.update.mockResolvedValue({ id: 'del-1' });

      await service.markInTransit('req-1', 'driver-1');

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ inTransitAt: expect.any(Date) }),
        }),
      );
      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.IN_TRANSIT,
        'driver-1',
      );
      expect(notifications.notifyStatusChange).toHaveBeenCalledWith(
        'cust-1',
        'REQ-1',
        RequestStatus.IN_TRANSIT,
      );
    });
  });

  // ─── completeDelivery ────────────────────────────────────────────────

  describe('completeDelivery', () => {
    it('records proof, transitions IN_TRANSIT → DELIVERED → COMPLETED', async () => {
      prisma.request.findUnique.mockResolvedValue({
        ...baseRequest,
        status: RequestStatus.IN_TRANSIT,
      });
      prisma.delivery.update.mockResolvedValue({ id: 'del-1' });

      await service.completeDelivery('req-1', 'driver-1', {
        proofFileId: 'file-9',
        proofLat: 17.9,
        proofLng: 102.6,
      });

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliveredAt: expect.any(Date),
            proofFileId: 'file-9',
            proofLat: 17.9,
            proofLng: 102.6,
          }),
        }),
      );
      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.DELIVERED,
        'driver-1',
      );
      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.COMPLETED,
        'driver-1',
      );
      expect(notifications.notifyStatusChange).toHaveBeenCalledWith(
        'cust-1',
        'REQ-1',
        RequestStatus.DELIVERED,
      );
    });

    it('throws NotFoundException when request missing', async () => {
      prisma.request.findUnique.mockResolvedValue(null);
      await expect(
        service.completeDelivery('bad', 'driver-1', { proofFileId: 'f', proofLat: 0, proofLng: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── queue ───────────────────────────────────────────────────────────

  describe('getQueue', () => {
    it('returns available pickups and the driver’s active deliveries', async () => {
      prisma.request.findMany.mockResolvedValue([baseRequest]);
      const result = await service.getQueue('driver-1');
      expect(prisma.request.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
