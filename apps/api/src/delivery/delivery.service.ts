import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateDeliveryFee, type DeliveryTier } from './fee.calculator';
import { haversineDistanceKm } from './haversine.distance';

interface OriginCoords {
  lat: number;
  lng: number;
}

export interface DeliveryCalcResult {
  distanceKm: number;
  fee: number;
  serviceable: boolean;
}

const FALLBACK_ORIGIN: OriginCoords = { lat: 17.9757, lng: 102.6331 };
const FALLBACK_TIERS: DeliveryTier[] = [
  { maxKm: 5, feeKip: 50000 },
  { maxKm: 10, feeKip: 100000 },
  { maxKm: 15, feeKip: 150000 },
  { maxKm: 20, feeKip: 200000 },
];

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public interface ──────────────────────────────────────────────────

  async calculateFee(customerLat: number, customerLng: number): Promise<DeliveryCalcResult> {
    const [origin, tiers] = await Promise.all([this.getOrigin(), this.getTiers()]);

    const distanceKm = haversineDistanceKm(origin.lat, origin.lng, customerLat, customerLng);
    const result = calculateDeliveryFee(distanceKm, tiers);

    if (!result.serviceable) {
      throw new UnprocessableEntityException(
        `Delivery address is ${distanceKm.toFixed(1)} km from our office — outside the 20 km service area. Please arrange a meeting point within 20 km.`,
      );
    }

    return result;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async getOrigin(): Promise<OriginCoords> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'origin_coordinates' },
      });
      if (setting?.value) return setting.value as unknown as OriginCoords;
    } catch {
      this.logger.warn('Could not load origin coordinates from settings, using fallback');
    }
    return FALLBACK_ORIGIN;
  }

  private async getTiers(): Promise<DeliveryTier[]> {
    try {
      const setting = await this.prisma.setting.findUnique({ where: { key: 'delivery_tiers' } });
      if (setting?.value) return setting.value as unknown as DeliveryTier[];
    } catch {
      this.logger.warn('Could not load delivery tiers from settings, using fallback');
    }
    return FALLBACK_TIERS;
  }
}
