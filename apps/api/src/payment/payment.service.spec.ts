import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentStatus, RequestStatus } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { PaymentService } from './payment.service';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

const mockRequest = {
  id: 'req-1',
  requestNumber: 'REQ-1',
  status: RequestStatus.SUBMITTED,
  totalAmount: new Decimal(400000),
  currency: 'LAK',
  customerId: 'user-1',
};

const mockPayment = {
  id: 'pay-1',
  requestId: 'req-1',
  provider: 'phapay',
  providerRef: 'bill-123',
  amount: new Decimal(400000),
  currency: 'LAK',
  status: PaymentStatus.PENDING,
  rawWebhook: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    request: { findUnique: jest.fn() },
    payment: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
}

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let provider: { createQr: jest.Mock; parseConfirmation: jest.Mock };
  let requests: { updateStatus: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    provider = {
      createQr: jest
        .fn()
        .mockResolvedValue({ billNumber: 'bill-123', refNo: '999', qrData: 'qr://x', raw: {} }),
      parseConfirmation: jest.fn((raw) => ({
        billNumber: raw.billNumber,
        transactionId: raw.transactionId,
        paymentMethod: raw.paymentMethod ?? 'BCEL',
        txnAmount: raw.txnAmount ?? 400000,
        status: raw.status ?? 'PAYMENT_COMPLETED',
        raw,
      })),
    };
    requests = { updateStatus: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: PAYMENT_PROVIDER, useValue: provider },
        { provide: RequestsService, useValue: requests },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createInvoice ────────────────────────────────────────────────────

  describe('createInvoice', () => {
    it('creates a pending payment and QR for a submitted request', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.createInvoice('req-1', 'user-1');

      expect(provider.createQr).toHaveBeenCalledWith(expect.objectContaining({ amount: 400000 }));
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(result.qrData).toBe('qr://x');
    });

    it('is idempotent — returns existing pending payment without new QR', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.payment.findUnique.mockResolvedValue(mockPayment); // already exists

      await service.createInvoice('req-1', 'user-1');

      expect(provider.createQr).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when request does not exist', async () => {
      prisma.request.findUnique.mockResolvedValue(null);
      await expect(service.createInvoice('bad', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when request has no total amount', async () => {
      prisma.request.findUnique.mockResolvedValue({ ...mockRequest, totalAmount: null });
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.createInvoice('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('transitions request SUBMITTED → AWAITING_PAYMENT', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue(mockPayment);

      await service.createInvoice('req-1', 'user-1');

      expect(requests.updateStatus).toHaveBeenCalledWith(
        'req-1',
        RequestStatus.AWAITING_PAYMENT,
        'user-1',
      );
    });
  });

  // ─── confirmPayment ───────────────────────────────────────────────────

  describe('confirmPayment', () => {
    const payload = {
      billNumber: 'bill-123',
      transactionId: 'txn-abc',
      paymentMethod: 'BCEL',
      txnAmount: 400000,
      status: 'PAYMENT_COMPLETED',
    };

    it('marks payment paid and transitions request to PAID', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      prisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PAID });

      await service.confirmPayment(payload);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.PAID }) }),
      );
      // null actor = system-initiated (socket/webhook), not a human
      expect(requests.updateStatus).toHaveBeenCalledWith('req-1', RequestStatus.PAID, null);
    });

    it('is idempotent — ignores a confirmation for an already-paid payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PAID });

      await service.confirmPayment(payload);

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(requests.updateStatus).not.toHaveBeenCalled();
    });

    it('ignores confirmation with no matching payment (logs, no throw)', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.confirmPayment(payload)).resolves.not.toThrow();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('ignores a non-completed status', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      await service.confirmPayment({ ...payload, status: 'PENDING' });
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('writes an audit log on successful confirmation', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      prisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PAID });

      await service.confirmPayment(payload);

      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
