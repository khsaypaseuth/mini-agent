import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorker } from './sw-register';

export const metadata: Metadata = {
  title: 'MiniAgent',
  description: 'ບໍລິການຜ່ານແດນ ລາວ-ໄທ — Border pass, vehicle documents, insurance, immigration',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MiniAgent' },
};

export const viewport: Viewport = {
  themeColor: '#014c8f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="min-h-screen bg-white antialiased">
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
