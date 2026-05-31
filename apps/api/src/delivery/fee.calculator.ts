export interface DeliveryTier {
  maxKm: number;
  feeKip: number;
}

export interface FeeResult {
  fee: number;
  serviceable: boolean;
  distanceKm: number;
}

export function calculateDeliveryFee(distanceKm: number, tiers: DeliveryTier[]): FeeResult {
  const sorted = [...tiers].sort((a, b) => a.maxKm - b.maxKm);
  const maxServiceableKm = sorted.at(-1)?.maxKm ?? 20;

  if (distanceKm > maxServiceableKm) {
    return { fee: 0, serviceable: false, distanceKm };
  }

  const tier = sorted.find((t) => distanceKm <= t.maxKm);
  return { fee: tier?.feeKip ?? 0, serviceable: true, distanceKm };
}
