'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@mini-agent/types';
import { getCurrentUser, isAuthenticated, logout, type AdminUser } from '@/lib/auth';
import { t } from '@/lib/i18n';

const NAV = [
  { href: '/dashboard', labelKey: 'admin.queue', roles: null },
  {
    href: '/dashboard/deliveries',
    labelKey: 'admin.deliveries',
    roles: [
      UserRole.DELIVERY_MAN,
      UserRole.MAIN_OFFICE_STAFF,
      UserRole.MANAGER,
      UserRole.SUPER_ADMIN,
    ] as UserRole[],
  },
  {
    href: '/dashboard/staff',
    labelKey: 'admin.staff',
    roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] as UserRole[],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setUser(getCurrentUser());
  }, [router]);

  if (!user) return null;

  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-primary-700 text-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 font-bold">
            M
          </div>
          <span className="font-semibold">{t('admin.title')}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-white/20 font-medium' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="mb-3 text-xs text-white/60">{user.role.replace(/_/g, ' ')}</p>
          <button onClick={logout} className="text-xs text-white/80 underline hover:text-white">
            {t('admin.sign_out')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
