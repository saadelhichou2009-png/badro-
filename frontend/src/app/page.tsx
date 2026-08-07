'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
    router.replace(hasToken ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
