import type { PricingOption } from '@prisma/client';

export interface PricingContext {
  passengerCount?: number;
  vehicleType?: string;
}

export interface PricingResult {
  baseAmount: number;
  currency: string;
  slaDays: number;
  label: Record<string, string>;
}

export function calculatePrice(option: PricingOption, context: PricingContext): PricingResult {
  const base = Number(option.amount);
  const label = option.label as Record<string, string>;
  const shared = { currency: option.currency, slaDays: option.slaDays, label };

  switch (option.pricingMode) {
    case 'flat':
    case 'conditional':
      return { baseAmount: base, ...shared };

    case 'per_person':
      return { baseAmount: base * (context.passengerCount ?? 1), ...shared };

    case 'per_vehicle_type': {
      const map = option.conditions as Record<string, number> | null;
      const vt = context.vehicleType;
      if (map && vt && vt in map) return { baseAmount: map[vt], ...shared };
      return { baseAmount: base, ...shared };
    }

    default:
      return { baseAmount: base, ...shared };
  }
}
