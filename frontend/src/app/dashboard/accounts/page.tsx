'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Copy, Check } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/lib/api-client';
import type { TradingAccount } from '@/types';

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get<{ data: { items: TradingAccount[] } }>('/accounts')).data.data.items,
  });

  const [form, setForm] = useState({
    accountName: '',
    accountNumber: '',
    broker: '',
    server: '',
    platform: 'MT5',
    currency: 'USD',
    leverage: 100,
    initialBalance: 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiClient.post('/accounts', form)).data.data,
    onSuccess: (data) => {
      toast.success('تم ربط الحساب بنجاح - احفظ مفتاح الـ API الآن');
      setNewApiKey(data.apiKey);
      localStorage.setItem('selectedAccountId', data.account.id);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowForm(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  function copyKey() {
    if (!newApiKey) return;
    navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {newApiKey && (
        <div className="card p-5 border-2 border-brand-500 animate-slide-up">
          <h3 className="font-semibold mb-2">🔑 مفتاح الـ API الخاص بحسابك</h3>
          <p className="text-sm text-gray-500 mb-3">
            انسخ هذا المفتاح الآن وأدخله في إعدادات الـ Expert Advisor — لن يُعرض مرة أخرى لأسباب أمنية.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-slate-800 p-3 font-mono text-sm break-all">
            <span className="flex-1">{newApiKey}</span>
            <button onClick={copyKey} className="shrink-0 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">
              {copied ? <Check size={16} className="text-profit" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">حسابات التداول المتصلة</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> ربط حساب جديد
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up"
        >
          {[
            { key: 'accountName', label: 'اسم الحساب (وصفي)' },
            { key: 'accountNumber', label: 'رقم الحساب' },
            { key: 'broker', label: 'الوسيط (Broker)' },
            { key: 'server', label: 'السيرفر' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input
                required
                value={(form as never)[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1.5">المنصة</label>
            <select
              value={form.platform}
              onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
            >
              <option value="MT4">MetaTrader 4</option>
              <option value="MT5">MetaTrader 5</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">الرافعة المالية</label>
            <input
              type="number"
              value={form.leverage}
              onChange={(e) => setForm((p) => ({ ...p, leverage: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5"
            >
              {createMutation.isPending ? 'جارِ الربط...' : 'ربط الحساب وتوليد مفتاح API'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32" />)}

        {accounts?.map((acc) => (
          <div
            key={acc.id}
            onClick={() => localStorage.setItem('selectedAccountId', acc.id)}
            className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{acc.accountName}</h4>
              <span
                className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                  acc.status === 'ACTIVE' ? 'bg-profit/10 text-profit' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
                }`}
              >
                {acc.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {acc.broker} • {acc.platform} • #{acc.accountNumber}
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الرصيد</span>
              <span className="font-semibold">{acc.balance.toLocaleString()} {acc.currency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
