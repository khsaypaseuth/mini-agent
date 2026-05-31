'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequestStatus } from '@mini-agent/types';
import { api } from '@/lib/api';
import { t, getLocale } from '@/lib/i18n';
import { localized } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

interface DeliveryItem {
  id: string;
  requestNumber: string;
  status: RequestStatus;
  gpsLat: string | null;
  gpsLng: string | null;
  customer?: { name: string; phone: string | null };
  service: { slug: string; name: Record<string, string> };
}

function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const locale = getLocale();

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-queue'],
    queryFn: async () => (await api.get<DeliveryItem[]>('/deliveries/queue')).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['delivery-queue'] });

  const pickup = useMutation({
    mutationFn: (id: string) => api.post(`/deliveries/${id}/pickup`),
    onSuccess: invalidate,
  });
  const inTransit = useMutation({
    mutationFn: (id: string) => api.post(`/deliveries/${id}/in-transit`),
    onSuccess: invalidate,
  });
  const deliver = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const loc = await getCurrentPosition();
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'proof');
      const uploaded = (await api.post('/files', form)).data;
      return api.post(`/deliveries/${id}/complete`, {
        proofFileId: uploaded.id,
        ...(loc ? { proofLat: loc.lat, proofLng: loc.lng } : {}),
      });
    },
    onSuccess: invalidate,
  });

  const available = data?.filter((d) => d.status === RequestStatus.READY_FOR_DELIVERY) ?? [];
  const active = data?.filter((d) => d.status !== RequestStatus.READY_FOR_DELIVERY) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">{t('admin.deliveries')}</h1>
      {isLoading && <p className="text-gray-500">{t('common.loading')}</p>}

      {data && data.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          {t('admin.no_deliveries')}
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            {t('admin.my_deliveries')}
          </h2>
          <div className="space-y-3">
            {active.map((d) => (
              <Card key={d.id} d={d} locale={locale}>
                {d.status === RequestStatus.PICKED_UP && (
                  <ActionButton
                    onClick={() => inTransit.mutate(d.id)}
                    pending={inTransit.isPending}
                    color="sky"
                  >
                    {t('admin.mark_in_transit')}
                  </ActionButton>
                )}
                {d.status === RequestStatus.IN_TRANSIT && (
                  <label className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                    {deliver.isPending ? t('admin.delivering') : t('admin.deliver')}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && deliver.mutate({ id: d.id, file: e.target.files[0] })
                      }
                    />
                  </label>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            {t('admin.available_pickups')}
          </h2>
          <div className="space-y-3">
            {available.map((d) => (
              <Card key={d.id} d={d} locale={locale}>
                <ActionButton
                  onClick={() => pickup.mutate(d.id)}
                  pending={pickup.isPending}
                  color="primary"
                >
                  {t('admin.confirm_pickup')}
                </ActionButton>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({
  d,
  locale,
  children,
}: {
  d: DeliveryItem;
  locale: string;
  children: React.ReactNode;
}) {
  const mapUrl =
    d.gpsLat && d.gpsLng
      ? `https://www.google.com/maps/search/?api=1&query=${d.gpsLat},${d.gpsLng}`
      : null;
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{d.requestNumber}</span>
          <StatusBadge status={d.status} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {localized(d.service?.name, locale)} · {d.customer?.name}
        </p>
        <div className="mt-1 flex gap-3 text-xs">
          {d.customer?.phone && (
            <a
              href={`https://wa.me/${d.customer.phone.replace(/[^0-9]/g, '')}`}
              className="text-green-700 underline"
            >
              WhatsApp
            </a>
          )}
          {mapUrl && (
            <a href={mapUrl} className="text-blue-700 underline">
              {t('admin.view_on_map')}
            </a>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ActionButton({
  onClick,
  pending,
  color,
  children,
}: {
  onClick: () => void;
  pending: boolean;
  color: 'primary' | 'sky';
  children: React.ReactNode;
}) {
  const styles =
    color === 'primary' ? 'bg-primary-500 hover:bg-primary-600' : 'bg-sky-600 hover:bg-sky-700';
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
