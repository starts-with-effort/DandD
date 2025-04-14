'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../../components/auth/LoginForm';
import { isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir si ya está autenticado
    if (typeof window !== 'undefined' && isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  return <LoginForm />;
}