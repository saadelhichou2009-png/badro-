'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: { period: string; profit: number }[];
}

export function ProfitBarChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-gray-400">لا توجد بيانات كافية بعد</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis dataKey="period" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} width={60} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.profit >= 0 ? '#16a34a' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
