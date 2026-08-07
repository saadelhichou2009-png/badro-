'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      /* الخطأ يُعرض عبر toast داخل useAuth */
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-dark px-4">
      <div className="w-full max-w-md card p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">📊 TradePulse</h1>
          <p className="mt-2 text-sm text-gray-500">سجّل الدخول لمتابعة أداء حساباتك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">كلمة المرور</label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                نسيت كلمة المرور؟
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 transition-colors"
          >
            <LogIn size={18} />
            {isLoading ? 'جارِ الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-brand-600 font-medium hover:underline">
            أنشئ حساباً جديداً
          </Link>
        </p>
      </div>
    </div>
  );
}
