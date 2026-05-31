import type { RequestStatus } from '@mini-agent/types';

export interface RequestListItem {
  id: string;
  requestNumber: string;
  status: RequestStatus;
  deliveryType: string;
  totalAmount: string | null;
  currency: string;
  createdAt: string;
  customer?: { name: string; phone: string | null };
  service: { slug: string; name: Record<string, string>; outputType: string };
}

export interface RequestInput {
  id: string;
  requirementKey: string;
  textValue: string | null;
  fileId: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface RequestDetail extends RequestListItem {
  gpsLat: string | null;
  gpsLng: string | null;
  distanceKm: string | null;
  deliveryFee: string | null;
  notes: string | null;
  inputs: RequestInput[];
  passengers: unknown[];
  statusHistory: StatusHistoryEntry[];
  pricingOption?: {
    label: Record<string, string>;
    amount: string;
    currency: string;
    slaDays: number;
  };
}

export interface LabelData {
  requestNumber: string;
  customerName: string;
  customerPhone: string | null;
  status: string;
  service: Record<string, string>;
  qrPayload: string;
  qrDataUrl: string;
  gpsMapUrl: string | null;
  createdAt: string;
}

export function localized(name: Record<string, string> | undefined, locale = 'en'): string {
  if (!name) return '';
  return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
}
