'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAuthenticated, isInGroup } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticación y permisos
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }

    // Verificar que es administrador
    if (!isInGroup('Administrador')) {
      router.push('/unauthorized');
    }
  }, [router]);

  return (
    children
  );
}