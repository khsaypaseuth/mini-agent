'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/auth';
import { resolveKey } from '@/lib/i18n';
import type { Locale } from '@mini-agent/i18n';

export default function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = (k: string) => resolveKey(locale as Locale, k);
  const router = useRouter();

  const [method, setMethod] = useState<'email' | 'phone'>('phone');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({
        name: form.name,
        password: form.password,
        locale,
        ...(method === 'email' ? { email: form.email } : { phone: form.phone }),
      });
      router.replace(`/${locale}`);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-4 py-10">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-primary-700">{t('auth.signup_title')}</h1>

        {/* method toggle */}
        <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
          {(['phone', 'email'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                method === m ? 'bg-white text-primary-700 shadow' : 'text-gray-500'
              }`}
            >
              {t(m === 'phone' ? 'customer.method_phone' : 'customer.method_email')}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            required
            placeholder="..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            aria-label="name"
          />
          {method === 'email' ? (
            <input
              type="email"
              required
              placeholder={t('auth.email')}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          ) : (
            <input
              type="tel"
              required
              placeholder="+856..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
            />
          )}
          <input
            type="password"
            required
            minLength={8}
            placeholder={t('auth.password')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-500 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? t('common.loading') : t('nav.signup')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          {t('auth.already_have_account')}{' '}
          <Link href={`/${locale}/login`} className="font-medium text-primary-600">
            {t('nav.login')}
          </Link>
        </p>
      </div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #d1d5db;
          padding: 0.625rem 0.75rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: #014c8f;
        }
      `}</style>
    </main>
  );
}
