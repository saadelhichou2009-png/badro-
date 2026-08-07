'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient, getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse, User } from '@/types';

export function useAuth() {
  const router = useRouter();
  const { setUser, logout: clearStore } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const { data } = await apiClient.post<
        ApiResponse<{ accessToken: string; refreshToken: string; user: User }>
      >('/auth/login', { email, password });

      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      setUser(data.data.user);

      toast.success('تم تسجيل الدخول بنجاح');
      router.push('/dashboard');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function register(payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', payload);
      toast.success('تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيله');
      router.push('/login');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // نتجاهل الخطأ - نسجل الخروج محلياً بأي حال
    } finally {
      clearStore();
      router.push('/login');
    }
  }

  return { login, register, logout, isLoading };
}
