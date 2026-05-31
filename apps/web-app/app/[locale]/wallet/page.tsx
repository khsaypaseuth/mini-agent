'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';

interface Balance {
  balance: number;
  points: number;
}
interface Txn {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  createdAt: string;
}

const TOPUP_PRESETS = [80000, 150000, 200000];

export default function WalletPage() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(80000);

  useEffect(() => {
    if (!isAuthenticated()) router.replace(`/${locale}/login`);
  }, [locale, router]);

  const { data: balance } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => (await api.get<Balance>('/wallet/balance')).data,
  });
  const { data: txns } = useQuery({
    queryKey: ['wallet-txns'],
    queryFn: async () => (await api.get<Txn[]>('/wallet/transactions')).data,
  });

  const topup = useMutation({
    mutationFn: () => api.post('/wallet/topup', { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      qc.invalidateQueries({ queryKey: ['wallet-txns'] });
    },
  });

  return (
    <main className="px-4 py-6">
      <h1 className="mb-5 text-xl font-bold text-gray-900">{t('nav.wallet')}</h1>

      {/* Balance card */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-500 p-6 text-white">
        <p className="text-sm text-white/80">{t('wallet.balance')}</p>
        <p className="mt-1 text-3xl font-bold">{(balance?.balance ?? 0).toLocaleString()} LAK</p>
        <p className="mt-2 text-sm text-white/80">
          {t('wallet.points')}: <span className="font-semibold">{balance?.points ?? 0}</span>
        </p>
      </div>

      {/* Top up */}
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('wallet.topup')}</h3>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {TOPUP_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`rounded-xl border py-2.5 text-sm font-medium ${
                amount === p
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
        <button
          onClick={() => topup.mutate()}
          disabled={topup.isPending}
          className="w-full rounded-xl bg-accent-500 py-3 font-semibold text-white disabled:opacity-60"
        >
          {t('wallet.topup')} {amount.toLocaleString()} LAK
        </button>
      </div>

      {/* History */}
      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('wallet.history')}</h3>
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          {txns?.length === 0 && <p className="p-4 text-sm text-gray-400">—</p>}
          {txns?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium capitalize text-gray-700">{tx.type}</p>
                <p className="text-xs text-gray-400">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={
                  tx.type === 'topup' || tx.type === 'refund' ? 'text-green-600' : 'text-gray-700'
                }
              >
                {Number(tx.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
