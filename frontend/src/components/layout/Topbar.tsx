'use client';

import { Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '@/components/providers';
import { useAuthStore } from '@/store/auth.store';

export function Topbar({ title }: { title: string }) {
  const { dark, toggle } = useTheme();
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-6 py-4">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="تبديل الوضع الليلي"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <Bell size={18} />
        </button>

        {user && (
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold">
              {user.firstName?.[0]}
            </div>
            <span className="hidden sm:inline text-sm font-medium">
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
