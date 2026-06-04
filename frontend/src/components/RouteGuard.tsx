'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '../store/useStore';
import { UserRole } from '../types';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, checkAuth } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const verify = async () => {
      // Check auth status
      const authed = await checkAuth();
      
      if (!authed) {
        // Not logged in -> redirect to login
        router.replace('/login');
        return;
      }

      // Check role permissions if restricted
      if (allowedRoles && allowedRoles.length > 0) {
        const currentUser = useStore.getState().user;
        if (!currentUser || !allowedRoles.includes(currentUser.role)) {
          // Role not allowed -> redirect to main dashboard
          router.replace('/dashboard');
          return;
        }
      }

      setIsAuthorized(true);
    };

    verify();
  }, [pathname, router, allowedRoles, checkAuth]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          {/* Loading Spinner */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
