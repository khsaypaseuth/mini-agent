import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from './services.service';

const mockService = {
  id: 'svc-1',
  slug: 'lao-border-pass',
  name: { lo: 'ໃບຜ່ານແດນ', en: 'Border Pass' },
  description: { lo: 'ບໍລິການໃບຜ່ານແດນ', en: 'Border pass service' },
  icon: '🛂',
  outputType: 'physical_doc',
  isActive: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    service: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ServicesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ──────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all active services ordered by sortOrder', async () => {
      prisma.service.findMany.mockResolvedValue([mockService]);

      const result = await service.findAll();

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('lao-border-pass');
    });

    it('can return inactive services when includeInactive=true', async () => {
      prisma.service.findMany.mockResolvedValue([mockService, { ...mockService, isActive: false }]);

      await service.findAll({ includeInactive: true });

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  // ─── findBySlug ───────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('returns service by slug with relations', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...mockService,
        inputRequirements: [],
        pricingOptions: [],
        deliveryOptions: [],
      });

      const result = await service.findBySlug('lao-border-pass');

      expect(result.slug).toBe('lao-border-pass');
    });

    it('throws NotFoundException for unknown slug', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.findBySlug('unknown-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns service by id', async () => {
      prisma.service.findUnique.mockResolvedValue({
        ...mockService,
        inputRequirements: [],
        pricingOptions: [],
        deliveryOptions: [],
      });

      const result = await service.findOne('svc-1');
      expect(result.id).toBe('svc-1');
    });

    it('throws NotFoundException for unknown id', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
