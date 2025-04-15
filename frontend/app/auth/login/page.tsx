'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../../components/auth/LoginForm';
import { isAuthenticated, getRedirectPath } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir si ya está autenticado
    if (typeof window !== 'undefined' && isAuthenticated()) {
      const redirectPath = getRedirectPath();
      router.push(redirectPath);
    }
  }, [router]);

  return <LoginForm />;
}