import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RequestStatus } from '@mini-agent/types';
import { ConfigService } from '@nestjs/config';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { RequestsService } from '../requests/requests.service';
import { CertificatesService } from './certificates.service';

const mockRequest = {
  id: 'req-1',
  requestNumber: 'REQ-1',
  status: RequestStatus.IN_PROGRESS,
  customerId: 'user-1',
};

const mockCert = {
  id: 'cert-1',
  requestId: 'req-1',
  fileId: 'file-1',
  downloadToken: 'tok-abc',
  qrLabelFileId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    request: { findUnique: jest.fn() },
    certificate: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    file: { findUnique: jest.fn() },
  };
}

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let requests: { updateStatus: jest.Mock };
  let notifications: { notifyStatusChange: jest.Mock };
  let files: { getDownloadUrl: jest.Mock };
  let qr: { certLabelDataUrl: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    requests = { updateStatus: jest.fn().mockResolvedValue({}) };
    notifications = { notifyStatusChange: jest.fn().mockResolvedValue(undefined) };
    files = { getDownloadUrl: jest.fn().mockResolvedValue('http://files/cert.pdf') };
    qr = { certLabelDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,XXX') };

    const module = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RequestsService, useValue: requests },
        { provide: NotificationsService, useValue: notifications },
        { provide: FilesService, useValue: files },
        { provide: QrService, useValue: qr },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3002') },
        },
      ],
    }).compile();

    service = module.get(CertificatesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── upload ──────────────────────────────────────────────────────────

  describe('upload', () => {
    it('creates a certificate and transitions request to CERTIFICATE_UPLOADED', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.certificate.findUnique.mockResolvedValue(null);
      prisma.certificate.create.mockResolvedValue(mockCert);

      const result = await service.upload('req-1', 'file-1', 'staff-1');

      expect(prisma.certificate.create).toHaveBeenCalled();
      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.CERTIFICATE_UPLOADED,
        'staff-1',
      );
      expect(result.downloadToken).toBe('tok-abc');
    });

    it('generates an unguessable download token', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.certificate.findUnique.mockResolvedValue(null);
      prisma.certificate.create.mockResolvedValue(mockCert);

      await service.upload('req-1', 'file-1', 'staff-1');

      const token = prisma.certificate.create.mock.calls[0][0].data.downloadToken;
      expect(token).toMatch(/^[0-9a-f]{32,}$/);
    });

    it('notifies the customer that the certificate is ready', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.certificate.findUnique.mockResolvedValue(null);
      prisma.certificate.create.mockResolvedValue(mockCert);

      await service.upload('req-1', 'file-1', 'staff-1');

      expect(notifications.notifyStatusChange).toHaveBeenCalledWith(
        'user-1',
        'REQ-1',
        RequestStatus.CERTIFICATE_UPLOADED,
      );
    });

    it('throws NotFoundException when request does not exist', async () => {
      prisma.request.findUnique.mockResolvedValue(null);
      await expect(service.upload('bad', 'file-1', 'staff-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when a certificate already exists', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.certificate.findUnique.mockResolvedValue(mockCert);
      await expect(service.upload('req-1', 'file-1', 'staff-1')).rejects.toThrow(ConflictException);
    });
  });

  // ─── getByDownloadToken (public) ─────────────────────────────────────

  describe('getByDownloadToken', () => {
    it('returns certificate metadata + signed download URL', async () => {
      prisma.certificate.findFirst.mockResolvedValue({
        ...mockCert,
        file: { id: 'file-1', storageKey: 'k', mime: 'application/pdf' },
        request: { requestNumber: 'REQ-1', service: { name: { en: 'Border Pass' } } },
      });

      const result = await service.getByDownloadToken('tok-abc');

      expect(files.getDownloadUrl).toHaveBeenCalled();
      expect(result.downloadUrl).toBe('http://files/cert.pdf');
      expect(result.requestNumber).toBe('REQ-1');
    });

    it('throws NotFoundException for an unknown token', async () => {
      prisma.certificate.findFirst.mockResolvedValue(null);
      await expect(service.getByDownloadToken('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── qrLabel ─────────────────────────────────────────────────────────

  describe('getQrLabel', () => {
    it('returns a 100x100 QR data URL pointing to the public download page', async () => {
      prisma.certificate.findUnique.mockResolvedValue(mockCert);

      const result = await service.getQrLabel('req-1');

      expect(qr.certLabelDataUrl).toHaveBeenCalledWith(expect.stringContaining('tok-abc'));
      expect(result.qrDataUrl).toMatch(/^data:image\/png/);
    });
  });
});
