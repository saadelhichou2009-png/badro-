'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, trend = 'neutral', subtitle }: StatCardProps) {
  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p
            className={clsx('mt-1 text-2xl font-bold', {
              'text-profit': trend === 'up',
              'text-loss': trend === 'down',
              'text-gray-900 dark:text-white': trend === 'neutral',
            })}
          >
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div
          className={clsx('rounded-xl p-2.5', {
            'bg-profit/10 text-profit': trend === 'up',
            'bg-loss/10 text-loss': trend === 'down',
            'bg-brand-500/10 text-brand-600 dark:text-brand-400': trend === 'neutral',
          })}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-7 w-32" />
    </div>
  );
}
