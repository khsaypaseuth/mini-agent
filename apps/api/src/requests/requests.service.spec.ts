import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import type { User } from '@prisma/client';
import { DeliveryType, RequestChannel, RequestStatus, UserRole } from '@mini-agent/types';
import { DeliveryService } from '../delivery/delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

const mockUser = (role: UserRole = UserRole.CUSTOMER): User =>
  ({
    id: 'user-1',
    role,
    name: 'Test',
    email: 'test@test.com',
    phone: null,
    passwordHash: null,
    locale: 'lo',
    status: 'active',
    walletBalance: new Decimal(0),
    points: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as User;

const mockRequest = {
  id: 'req-1',
  requestNumber: 'REQ-20260530-ABC123',
  publicToken: 'tok123',
  customerId: 'user-1',
  serviceId: 'svc-1',
  pricingOptionId: 'po-1',
  channel: RequestChannel.WEB,
  status: RequestStatus.DRAFT,
  deliveryType: DeliveryType.PHYSICAL,
  gpsLat: null,
  gpsLng: null,
  distanceKm: null,
  deliveryFee: null,
  totalAmount: null,
  currency: 'LAK',
  assignedStaffId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    request: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    requestStatusHistory: { create: jest.fn() },
    pricingOption: { findUnique: jest.fn() },
    staffServiceAssignment: { findMany: jest.fn() },
  };
}

describe('RequestsService', () => {
  let service: RequestsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let deliveryService: { calculateFee: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    deliveryService = {
      calculateFee: jest
        .fn()
        .mockResolvedValue({ distanceKm: 7.5, fee: 100000, serviceable: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DeliveryService, useValue: deliveryService },
      ],
    }).compile();

    service = module.get(RequestsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ───────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      serviceId: 'svc-1',
      deliveryType: DeliveryType.PHYSICAL,
      channel: RequestChannel.WEB,
      gpsLat: 17.9,
      gpsLng: 102.6,
    };

    beforeEach(() => {
      prisma.request.create.mockResolvedValue({ ...mockRequest, ...dto });
      prisma.requestStatusHistory.create.mockResolvedValue({});
    });

    it('creates request with DRAFT status', async () => {
      await service.create(dto, 'user-1');
      expect(prisma.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RequestStatus.DRAFT }),
        }),
      );
    });

    it('generates a requestNumber starting with REQ-', async () => {
      await service.create(dto, 'user-1');
      const call = prisma.request.create.mock.calls[0][0];
      expect(call.data.requestNumber).toMatch(/^REQ-/);
    });

    it('generates a publicToken (32 hex chars)', async () => {
      await service.create(dto, 'user-1');
      const call = prisma.request.create.mock.calls[0][0];
      expect(call.data.publicToken).toMatch(/^[0-9a-f]{32}$/);
    });

    it('calls DeliveryService for physical delivery', async () => {
      await service.create(dto, 'user-1');
      expect(deliveryService.calculateFee).toHaveBeenCalledWith(17.9, 102.6);
    });

    it('does NOT call DeliveryService for digital-only delivery', async () => {
      const digitalDto = {
        ...dto,
        deliveryType: DeliveryType.DIGITAL_PDF,
        gpsLat: undefined,
        gpsLng: undefined,
      };
      prisma.request.create.mockResolvedValue({
        ...mockRequest,
        deliveryType: DeliveryType.DIGITAL_PDF,
      });
      await service.create(digitalDto, 'user-1');
      expect(deliveryService.calculateFee).not.toHaveBeenCalled();
    });

    it('writes DRAFT status history entry', async () => {
      await service.create(dto, 'user-1');
      expect(prisma.requestStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ toStatus: RequestStatus.DRAFT }),
        }),
      );
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────

  describe('updateStatus', () => {
    beforeEach(() => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.request.update.mockResolvedValue({ ...mockRequest, status: RequestStatus.SUBMITTED });
      prisma.requestStatusHistory.create.mockResolvedValue({});
    });

    it('transitions to valid next status', async () => {
      await service.updateStatus('req-1', RequestStatus.SUBMITTED, 'user-1');
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RequestStatus.SUBMITTED }),
        }),
      );
    });

    it('writes status history entry', async () => {
      await service.updateStatus('req-1', RequestStatus.SUBMITTED, 'user-1');
      expect(prisma.requestStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: RequestStatus.DRAFT,
            toStatus: RequestStatus.SUBMITTED,
          }),
        }),
      );
    });

    it('throws BadRequestException for invalid transition (DRAFT → PAID)', async () => {
      await expect(service.updateStatus('req-1', RequestStatus.PAID, 'user-1')).rejects.toThrow();
    });

    it('throws NotFoundException when request not found', async () => {
      prisma.request.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('bad-id', RequestStatus.SUBMITTED, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll — role-scoped ─────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      prisma.request.findMany.mockResolvedValue([mockRequest]);
      prisma.staffServiceAssignment.findMany.mockResolvedValue([{ serviceId: 'svc-1' }]);
    });

    it('filters by customerId for customer role', async () => {
      await service.findAll(mockUser(UserRole.CUSTOMER));
      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ customerId: 'user-1' }) }),
      );
    });

    it('does not filter for main_office_staff (sees all)', async () => {
      await service.findAll(mockUser(UserRole.MAIN_OFFICE_STAFF));
      const call = prisma.request.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('customerId');
    });

    it('filters by assigned serviceIds for back_office_staff', async () => {
      await service.findAll(mockUser(UserRole.BACK_OFFICE_STAFF));
      const call = prisma.request.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('serviceId');
    });
  });
});
