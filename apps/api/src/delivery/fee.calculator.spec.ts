import { calculateDeliveryFee } from './fee.calculator';

const DEFAULT_TIERS = [
  { maxKm: 5, feeKip: 50000 },
  { maxKm: 10, feeKip: 100000 },
  { maxKm: 15, feeKip: 150000 },
  { maxKm: 20, feeKip: 200000 },
];

describe('FeeCalculator — calculateDeliveryFee', () => {
  it('charges 50,000 LAK for distance ≤ 5 km', () => {
    expect(calculateDeliveryFee(0, DEFAULT_TIERS)).toMatchObject({ fee: 50000, serviceable: true });
    expect(calculateDeliveryFee(3.5, DEFAULT_TIERS)).toMatchObject({ fee: 50000, serviceable: true });
    expect(calculateDeliveryFee(5, DEFAULT_TIERS)).toMatchObject({ fee: 50000, serviceable: true });
  });

  it('charges 100,000 LAK for 5.1–10 km', () => {
    expect(calculateDeliveryFee(5.1, DEFAULT_TIERS)).toMatchObject({ fee: 100000, serviceable: true });
    expect(calculateDeliveryFee(8, DEFAULT_TIERS)).toMatchObject({ fee: 100000, serviceable: true });
    expect(calculateDeliveryFee(10, DEFAULT_TIERS)).toMatchObject({ fee: 100000, serviceable: true });
  });

  it('charges 150,000 LAK for 10.1–15 km', () => {
    expect(calculateDeliveryFee(10.1, DEFAULT_TIERS)).toMatchObject({ fee: 150000, serviceable: true });
    expect(calculateDeliveryFee(15, DEFAULT_TIERS)).toMatchObject({ fee: 150000, serviceable: true });
  });

  it('charges 200,000 LAK for 15.1–20 km', () => {
    expect(calculateDeliveryFee(15.1, DEFAULT_TIERS)).toMatchObject({ fee: 200000, serviceable: true });
    expect(calculateDeliveryFee(20, DEFAULT_TIERS)).toMatchObject({ fee: 200000, serviceable: true });
  });

  it('marks NOT serviceable for distance > 20 km', () => {
    expect(calculateDeliveryFee(20.1, DEFAULT_TIERS)).toMatchObject({ fee: 0, serviceable: false });
    expect(calculateDeliveryFee(50, DEFAULT_TIERS)).toMatchObject({ fee: 0, serviceable: false });
    expect(calculateDeliveryFee(100, DEFAULT_TIERS)).toMatchObject({ fee: 0, serviceable: false });
  });

  it('echoes the distance in the result', () => {
    const result = calculateDeliveryFee(7.3, DEFAULT_TIERS);
    expect(result.distanceKm).toBe(7.3);
  });

  it('uses custom tiers from settings (configurable)', () => {
    const customTiers = [
      { maxKm: 3, feeKip: 30000 },
      { maxKm: 8, feeKip: 80000 },
    ];
    expect(calculateDeliveryFee(2, customTiers)).toMatchObject({ fee: 30000, serviceable: true });
    expect(calculateDeliveryFee(8.1, customTiers)).toMatchObject({ fee: 0, serviceable: false });
  });

  it('handles tiers provided in any order (sorts internally)', () => {
    const shuffled = [...DEFAULT_TIERS].reverse();
    expect(calculateDeliveryFee(7, shuffled)).toMatchObject({ fee: 100000, serviceable: true });
  });
});
