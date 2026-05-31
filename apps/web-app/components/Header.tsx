'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { locales, useLocale, useT } from '@/lib/i18n';
import { getCurrentUser, logout, type CustomerUser } from '@/lib/auth';

const LOCALE_LABELS: Record<string, string> = {
  lo: 'ລາວ',
  th: 'ไทย',
  en: 'EN',
  zh: '中文',
  vi: 'VI',
  ko: '한국어',
  hmn: 'Hmoob',
};

export function Header() {
  const locale = useLocale();
  const t = useT();
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setUser(getCurrentUser()), []);

  function switchLocale(next: string) {
    const path = window.location.pathname.replace(/^\/[^/]+/, `/${next}`);
    window.location.href = path + window.location.search;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white">
            M
          </span>
          <span className="font-bold text-primary-700">{t('common.app_name')}</span>
        </Link>

        <div className="flex items-center gap-2">
          <select
            value={locale}
            onChange={(e) => switchLocale(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
            aria-label="language"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l] ?? l}
              </option>
            ))}
          </select>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  <Link
                    href={`/${locale}/requests`}
                    className="block px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    {t('nav.requests')}
                  </Link>
                  <Link
                    href={`/${locale}/wallet`}
                    className="block px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    {t('nav.wallet')}
                  </Link>
                  <button
                    onClick={() => logout(locale)}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
