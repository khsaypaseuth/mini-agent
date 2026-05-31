'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { resolveKey } from '@/lib/i18n';
import type { Locale } from '@mini-agent/i18n';

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = (k: string) => resolveKey(locale as Locale, k);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email }, password);
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
        <h1 className="mb-6 text-2xl font-bold text-primary-700">{t('auth.login_title')}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field label={t('auth.password')}>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-500 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? t('common.loading') : t('nav.login')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          {t('auth.no_account')}{' '}
          <Link href={`/${locale}/signup`} className="font-medium text-primary-600">
            {t('nav.signup')}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
