import type { PricingOption } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { calculatePrice } from './pricing.engine';

function makePricingOption(overrides: Partial<PricingOption> = {}): PricingOption {
  return {
    id: 'po-1',
    serviceId: 'svc-1',
    label: { lo: 'ດ່ວນ', en: 'Fast' },
    amount: new Decimal(300000),
    currency: 'LAK',
    slaDays: 2,
    pricingMode: 'flat',
    conditions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PricingOption;
}

describe('PricingEngine — calculatePrice', () => {
  describe('flat pricing', () => {
    it('returns the fixed amount unchanged', () => {
      const result = calculatePrice(makePricingOption(), {});
      expect(result.baseAmount).toBe(300000);
      expect(result.currency).toBe('LAK');
      expect(result.slaDays).toBe(2);
    });

    it('ignores passenger count', () => {
      expect(calculatePrice(makePricingOption(), { passengerCount: 5 }).baseAmount).toBe(300000);
    });
  });

  describe('per_person pricing', () => {
    const perPersonOption = makePricingOption({ pricingMode: 'per_person', amount: new Decimal(20000) });

    it('multiplies by passenger count', () => {
      expect(calculatePrice(perPersonOption, { passengerCount: 3 }).baseAmount).toBe(60000);
    });

    it('defaults to 1 passenger when not provided', () => {
      expect(calculatePrice(perPersonOption, {}).baseAmount).toBe(20000);
    });

    it('handles large groups', () => {
      expect(calculatePrice(makePricingOption({ pricingMode: 'per_person', amount: new Decimal(15000) }), { passengerCount: 10 }).baseAmount).toBe(150000);
    });
  });

  describe('per_vehicle_type pricing', () => {
    const prices = { motorcycle: 1200, sedan: 2500, suv: 3000, pickup: 2800, van: 3500, truck: 5000 };
    const option = makePricingOption({ pricingMode: 'per_vehicle_type', amount: new Decimal(0), conditions: prices as unknown as null });

    it('returns price for known vehicle type', () => {
      expect(calculatePrice(option, { vehicleType: 'sedan' }).baseAmount).toBe(2500);
      expect(calculatePrice(option, { vehicleType: 'suv' }).baseAmount).toBe(3000);
      expect(calculatePrice(option, { vehicleType: 'truck' }).baseAmount).toBe(5000);
    });

    it('falls back to base amount for unknown vehicle type', () => {
      const opt = makePricingOption({ pricingMode: 'per_vehicle_type', amount: new Decimal(999), conditions: prices as unknown as null });
      expect(calculatePrice(opt, { vehicleType: 'spaceship' }).baseAmount).toBe(999);
    });

    it('falls back to base amount when vehicleType not provided', () => {
      const opt = makePricingOption({ pricingMode: 'per_vehicle_type', amount: new Decimal(999), conditions: prices as unknown as null });
      expect(calculatePrice(opt, {}).baseAmount).toBe(999);
    });
  });

  describe('conditional pricing', () => {
    it('returns base amount (exact price confirmed at appointment)', () => {
      const option = makePricingOption({
        pricingMode: 'conditional',
        amount: new Decimal(480),
        currency: 'USD',
        conditions: { range: [480, 680] } as unknown as null,
      });
      const result = calculatePrice(option, {});
      expect(result.baseAmount).toBe(480);
      expect(result.currency).toBe('USD');
    });
  });

  describe('label passthrough', () => {
    it('returns the i18n label object', () => {
      const option = makePricingOption({ label: { lo: 'ດ່ວນ', en: 'Fast', th: 'ด่วน' } });
      expect(calculatePrice(option, {}).label).toEqual({ lo: 'ດ່ວນ', en: 'Fast', th: 'ด่วน' });
    });
  });
});
