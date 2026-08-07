'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register(form);
    } catch {
      /* الخطأ يُعرض عبر toast */
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-dark px-4 py-10">
      <div className="w-full max-w-md card p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">📊 TradePulse</h1>
          <p className="mt-2 text-sm text-gray-500">أنشئ حسابك وابدأ بتحليل تداولاتك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">الاسم الأول</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الاسم الأخير</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">كلمة المرور</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="8 أحرف على الأقل، حرف كبير وصغير ورقم ورمز"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 transition-colors"
          >
            <UserPlus size={18} />
            {isLoading ? 'جارِ الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            سجّل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
