import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { RequestStatus } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { RequestsService } from '../requests/requests.service';
import { LabelsService } from './labels.service';

const mockRequest = {
  id: 'req-1',
  requestNumber: 'REQ-1',
  publicToken: 'pubtok-123',
  status: RequestStatus.CERTIFICATE_UPLOADED,
  deliveryType: 'physical',
  gpsLat: new Decimal(17.98),
  gpsLng: new Decimal(102.64),
  customer: { name: 'Somchai', phone: '+85620123456' },
  service: { name: { en: 'Border Pass' } },
};

const mockLabel = {
  id: 'label-1',
  requestId: 'req-1',
  qrPayload: 'http://localhost:3002/track/pubtok-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    request: { findUnique: jest.fn() },
    label: { findUnique: jest.fn(), upsert: jest.fn() },
  };
}

describe('LabelsService', () => {
  let service: LabelsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let requests: { updateStatus: jest.Mock };
  let qr: { toDataUrl: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    requests = { updateStatus: jest.fn().mockResolvedValue({}) };
    qr = { toDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,QR') };

    const module = await Test.createTestingModule({
      providers: [
        LabelsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RequestsService, useValue: requests },
        { provide: QrService, useValue: qr },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3002') },
        },
      ],
    }).compile();

    service = module.get(LabelsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generate', () => {
    it('builds a QR payload pointing to the public tracking page', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.label.upsert.mockResolvedValue(mockLabel);

      const result = await service.generate('req-1', 'staff-1');

      expect(qr.toDataUrl).toHaveBeenCalledWith(expect.stringContaining('pubtok-123'));
      expect(result.qrPayload).toContain('pubtok-123');
      expect(result.qrDataUrl).toMatch(/^data:image\/png/);
    });

    it('includes customer + request details for the printable label', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.label.upsert.mockResolvedValue(mockLabel);

      const result = await service.generate('req-1', 'staff-1');

      expect(result.requestNumber).toBe('REQ-1');
      expect(result.customerName).toBe('Somchai');
      expect(result.customerPhone).toBe('+85620123456');
      expect(result.gpsMapUrl).toContain('17.98');
    });

    it('transitions CERTIFICATE_UPLOADED → READY_FOR_DELIVERY for physical delivery', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.label.upsert.mockResolvedValue(mockLabel);

      await service.generate('req-1', 'staff-1');

      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.READY_FOR_DELIVERY,
        'staff-1',
      );
    });

    it('does NOT transition again if already READY_FOR_DELIVERY (re-print)', async () => {
      prisma.request.findUnique.mockResolvedValue({
        ...mockRequest,
        status: RequestStatus.READY_FOR_DELIVERY,
      });
      prisma.label.upsert.mockResolvedValue(mockLabel);

      await service.generate('req-1', 'staff-1');

      expect(requests.updateStatus).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when request does not exist', async () => {
      prisma.request.findUnique.mockResolvedValue(null);
      await expect(service.generate('bad', 'staff-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLabel', () => {
    it('returns print data for an existing label', async () => {
      prisma.label.findUnique.mockResolvedValue(mockLabel);
      prisma.request.findUnique.mockResolvedValue(mockRequest);

      const result = await service.getLabel('req-1');

      expect(result.requestNumber).toBe('REQ-1');
      expect(result.qrDataUrl).toMatch(/^data:image\/png/);
    });

    it('throws NotFoundException when no label exists', async () => {
      prisma.label.findUnique.mockResolvedValue(null);
      await expect(service.getLabel('req-1')).rejects.toThrow(NotFoundException);
    });
  });
});
