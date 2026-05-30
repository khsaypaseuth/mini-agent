import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MiniAgent',
  description: 'ບໍລິການຜ່ານແດນ ລາວ-ໄທ — Border pass, vehicle documents, insurance, immigration',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#014c8f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo">
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}
