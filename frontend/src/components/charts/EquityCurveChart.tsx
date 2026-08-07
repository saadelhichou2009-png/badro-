'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { EquityPoint } from '@/types';

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  const chartData = data.map((p) => ({
    date: format(new Date(p.recordedAt), 'MM/dd'),
    equity: p.equity,
    balance: p.balance,
  }));

  if (chartData.length === 0) {
    return <div className="h-72 flex items-center justify-center text-sm text-gray-400">لا توجد بيانات كافية بعد</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Area type="monotone" dataKey="equity" name="Equity" stroke="#3b82f6" fill="url(#equityGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="balance" name="Balance" stroke="#16a34a" fillOpacity={0} strokeWidth={2} strokeDasharray="4 4" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
