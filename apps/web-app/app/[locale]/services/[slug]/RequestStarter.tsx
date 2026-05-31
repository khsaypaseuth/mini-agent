'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeliveryType } from '@mini-agent/types';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useLocale, useT, localizedName } from '@/lib/i18n';
import type { Service } from '@/lib/types';

export function RequestStarter({ service }: { service: Service }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  const offersPhysical = service.deliveryOptions.some((d) => d.type !== DeliveryType.DIGITAL_PDF);
  const offersDigital = service.deliveryOptions.some(
    (d) => d.type === DeliveryType.DIGITAL_PDF || d.type === DeliveryType.BOTH,
  );

  const [pricingOptionId, setPricingOptionId] = useState(service.pricingOptions[0]?.id ?? '');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    offersPhysical ? DeliveryType.PHYSICAL : DeliveryType.DIGITAL_PDF,
  );
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function locate() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  async function start() {
    if (!isAuthenticated()) {
      router.push(`/${locale}/login`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body = {
        serviceId: service.id,
        pricingOptionId,
        deliveryType,
        channel: 'web',
        ...(deliveryType !== DeliveryType.DIGITAL_PDF && gps
          ? { gpsLat: gps.lat, gpsLng: gps.lng }
          : {}),
      };
      const req = (await api.post('/requests', body)).data;
      router.push(`/${locale}/requests/${req.id}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : t('common.error'));
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Pricing */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('customer.select_speed')}</h3>
        <div className="space-y-2">
          {service.pricingOptions.map((po) => (
            <button
              key={po.id}
              onClick={() => setPricingOptionId(po.id)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                pricingOptionId === po.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">{localizedName(po.label, locale)}</p>
                <p className="text-xs text-gray-500">
                  {t('services.sla_days').replace('{days}', String(po.slaDays))}
                </p>
              </div>
              <p className="font-semibold text-accent-600">
                {Number(po.amount).toLocaleString()} {po.currency}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Delivery */}
      {offersPhysical && offersDigital && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('customer.delivery_method')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <DeliveryChoice
              active={deliveryType === DeliveryType.PHYSICAL}
              onClick={() => setDeliveryType(DeliveryType.PHYSICAL)}
              label={t('customer.door_delivery')}
            />
            <DeliveryChoice
              active={deliveryType === DeliveryType.DIGITAL_PDF}
              onClick={() => setDeliveryType(DeliveryType.DIGITAL_PDF)}
              label={t('customer.digital_only')}
            />
          </div>
        </div>
      )}

      {/* GPS for physical */}
      {deliveryType !== DeliveryType.DIGITAL_PDF && (
        <button
          onClick={locate}
          className={`w-full rounded-xl border-2 border-dashed py-3 text-sm font-medium ${
            gps ? 'border-green-400 text-green-700' : 'border-gray-300 text-gray-600'
          }`}
        >
          {locating
            ? t('customer.locating')
            : gps
              ? `📍 ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`
              : `📍 ${t('customer.use_my_location')}`}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={start}
        disabled={submitting}
        className="w-full rounded-xl bg-primary-500 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? t('common.loading') : t('customer.continue')}
      </button>
    </div>
  );
}

function DeliveryChoice({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-sm font-medium transition ${
        active
          ? 'border-primary-500 bg-primary-50 text-primary-700'
          : 'border-gray-200 bg-white text-gray-600'
      }`}
    >
      {label}
    </button>
  );
}
