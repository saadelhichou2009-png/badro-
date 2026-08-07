import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradePulse — منصة تحليل حسابات التداول',
  description: 'تحليل احترافي لحسابات MT4/MT5 - أداء، إحصائيات، ورسوم بيانية لحظية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
