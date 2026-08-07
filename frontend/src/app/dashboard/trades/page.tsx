'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import type { Trade, Pagination } from '@/types';

// ملاحظة: في نسخة كاملة سيتم اختيار الحساب من قائمة منسدلة، هنا نفترض وجود accountId في localStorage
// بعد ربط أول حساب من صفحة /dashboard/accounts
function useSelectedAccountId() {
  const [id] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('selectedAccountId') : null,
  );
  return id;
}

export default function TradesPage() {
  const accountId = useSelectedAccountId();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['trades', accountId, page, search, status],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Trade[]; pagination: Pagination }>(
        `/accounts/${accountId}/trades`,
        { params: { page, limit: 20, search: search || undefined, status: status || undefined } },
      );
      return data;
    },
    enabled: !!accountId,
  });

  if (!accountId) {
    return (
      <div className="card p-10 text-center text-gray-500">
        الرجاء ربط حساب تداول أولاً من صفحة الحسابات لعرض الصفقات.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث بالزوج أو التذكرة..."
            className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="OPEN">مفتوحة</option>
          <option value="CLOSED">مغلقة</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-gray-400">
              <tr>
                {['التذكرة', 'الزوج', 'النوع', 'الحجم', 'فتح', 'إغلاق', 'دخول', 'خروج', 'عمولة', 'Swap', 'الربح', 'المدة'].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={12} className="px-4 py-3">
                      <div className="skeleton h-5 w-full" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                data?.items.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap">{t.ticket}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{t.symbol}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', {
                          'bg-profit/10 text-profit': t.type.startsWith('BUY'),
                          'bg-loss/10 text-loss': t.type.startsWith('SELL'),
                        })}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.lotSize}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(t.openTime).toLocaleString('ar')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.closeTime ? new Date(t.closeTime).toLocaleString('ar') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.openPrice}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.closePrice ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.commission}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.swap}</td>
                    <td
                      className={clsx('px-4 py-3 whitespace-nowrap font-semibold', {
                        'text-profit': t.profit >= 0,
                        'text-loss': t.profit < 0,
                      })}
                    >
                      {t.profit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.durationMinutes !== null ? `${t.durationMinutes} د` : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-500">
              صفحة {data.pagination.page} من {data.pagination.totalPages} ({data.pagination.total} صفقة)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
