'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Percent, Target, Wallet, Activity } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { StatCard, StatCardSkeleton } from '@/components/ui/StatCard';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { ProfitBarChart } from '@/components/charts/ProfitBarChart';

interface OverviewResponse {
  accountsCount: number;
  activeAccountsCount: number;
  totalBalance: number;
  totalEquity: number;
  totalNetProfit: number;
  totalTrades: number;
  overallWinRate: number;
  accounts: { id: string; accountName: string; balance: number; equity: number; netProfit: number; winRate: number }[];
}

function money(n: number) {
  return n.toLocaleString('ar', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => (await apiClient.get<{ data: OverviewResponse }>('/dashboard')).data.data,
  });

  const firstAccountId = overview?.accounts?.[0]?.id;

  const { data: equityCurve } = useQuery({
    queryKey: ['equity-curve', firstAccountId],
    queryFn: async () =>
      (await apiClient.get(`/accounts/${firstAccountId}/statistics/equity-curve`)).data.data,
    enabled: !!firstAccountId,
  });

  const { data: monthlyProfit } = useQuery({
    queryKey: ['monthly-profit', firstAccountId],
    queryFn: async () =>
      (await apiClient.get(`/accounts/${firstAccountId}/statistics/monthly-profit`)).data.data,
    enabled: !!firstAccountId,
  });

  if (!isLoading && overview?.accountsCount === 0) {
    return (
      <div className="card p-10 text-center">
        <Wallet className="mx-auto mb-4 text-gray-400" size={40} />
        <h3 className="text-lg font-semibold mb-2">لا يوجد لديك أي حساب متصل بعد</h3>
        <p className="text-sm text-gray-500 mb-4">اربط حساب MT4 أو MT5 لتبدأ برؤية إحصائياتك هنا</p>
        <a href="/dashboard/accounts" className="inline-block rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-700">
          ربط حساب جديد
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="إجمالي الرصيد" value={money(overview?.totalBalance ?? 0)} icon={Wallet} />
            <StatCard title="Equity الحالية" value={money(overview?.totalEquity ?? 0)} icon={Activity} />
            <StatCard
              title="صافي الربح"
              value={money(overview?.totalNetProfit ?? 0)}
              icon={overview && overview.totalNetProfit >= 0 ? TrendingUp : TrendingDown}
              trend={overview && overview.totalNetProfit >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title="نسبة الفوز"
              value={`${(overview?.overallWinRate ?? 0).toFixed(1)}%`}
              icon={Percent}
              trend="neutral"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold mb-4">Equity Curve</h3>
          <EquityCurveChart data={equityCurve ?? []} />
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target size={16} /> الحسابات المتصلة
          </h3>
          <div className="space-y-3">
            {overview?.accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                <div>
                  <p className="text-sm font-medium">{acc.accountName}</p>
                  <p className="text-xs text-gray-400">Win Rate: {acc.winRate.toFixed(1)}%</p>
                </div>
                <span className={acc.netProfit >= 0 ? 'text-profit text-sm font-semibold' : 'text-loss text-sm font-semibold'}>
                  {money(acc.netProfit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-4">الأرباح الشهرية</h3>
        <ProfitBarChart data={monthlyProfit ?? []} />
      </div>
    </div>
  );
}
