import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MiniAgent Admin',
  description: 'MiniAgent — admin dashboard for staff and managers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
