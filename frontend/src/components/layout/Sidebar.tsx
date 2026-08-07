'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, LineChart, Wallet, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/trades', label: 'الصفقات', icon: LineChart },
  { href: '/dashboard/accounts', label: 'الحسابات', icon: Wallet },
  { href: '/dashboard/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0">
      <div className="p-5 border-b border-gray-200 dark:border-slate-800">
        <h1 className="text-lg font-bold text-brand-600 dark:text-brand-400">📊 TradePulse</h1>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-slate-800">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-loss hover:bg-loss/10 transition-colors"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
