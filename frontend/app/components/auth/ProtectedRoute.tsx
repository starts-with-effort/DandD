'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isInGroup } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedGroups?: string[];
}

export default function ProtectedRoute({ children, allowedGroups }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticación
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }

    // Verificar permisos de grupo si se especifican
    if (allowedGroups && allowedGroups.length > 0) {
      const hasAccess = allowedGroups.some(group => isInGroup(group));
      if (!hasAccess) {
        router.push('/unauthorized');
        return;
      }
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [router, allowedGroups]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}