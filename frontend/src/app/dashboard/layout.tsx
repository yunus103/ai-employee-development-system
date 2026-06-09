'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '../../store/useStore';
import RouteGuard from '../../components/RouteGuard';
import { apiClient } from '../../services/apiClient';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  LogOut,
  Shield,
  Cpu,
  Layers,
  CheckCircle,
  XCircle,
  Database,
  User,
  Loader2
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useStore();
  
  // Health states
  const [healthStatus, setHealthStatus] = useState<{
    api: 'checking' | 'ok' | 'error';
    ml: 'checking' | 'ok' | 'error' | 'not-loaded';
  }>({ api: 'checking', ml: 'checking' });

  useEffect(() => {
    const checkSystemHealth = async () => {
      if (apiClient.isMock) {
        setHealthStatus({ api: 'ok', ml: 'ok' });
        return;
      }

      try {
        // Build correct URL: if API_URL is '/' or relative, use window.location.origin
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/').replace(/\/$/, '');
        const healthUrl = baseUrl ? `${baseUrl}/api/health` : '/api/health';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(healthUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          setHealthStatus({ api: 'error', ml: 'error' });
          return;
        }

        const json = await response.json();

        // Support both response formats:
        // Format A (nested): { success: true, data: { api: 'ok', mlService: { status: 'ok' } } }
        // Format B (flat):   { status: 'Healthy', timestamp: '...' }
        if (json.success && json.data) {
          const apiState = json.data.api === 'ok' ? 'ok' : 'error';
          const mlState = json.data.mlService?.status === 'ok' ? 'ok' : 'not-loaded';
          setHealthStatus({ api: apiState, ml: mlState });
        } else if (typeof json.status === 'string') {
          const apiOk = json.status.toLowerCase() === 'healthy' || json.status.toLowerCase() === 'ok';
          setHealthStatus({ api: apiOk ? 'ok' : 'error', ml: 'not-loaded' });
        } else {
          // Unexpected format but got a 200 — treat as ok
          setHealthStatus({ api: 'ok', ml: 'not-loaded' });
        }
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) {
          // Timeout — server might be cold starting, show unknown
          setHealthStatus({ api: 'error', ml: 'not-loaded' });
        } else {
          setHealthStatus({ api: 'error', ml: 'error' });
        }
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Nav items based on role
  const getNavItems = () => {
    if (!user) return [];
    
    const items = [
      {
        label: 'Genel Bakış',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['Admin', 'HR', 'Manager', 'Employee']
      },
      {
        label: 'Çalışan Listesi',
        path: '/dashboard/employees',
        icon: Users,
        roles: ['Admin', 'HR', 'Manager']
      },
      {
        label: 'Gelişim Planım',
        path: '/dashboard/employee-plan',
        icon: Layers,
        roles: ['Employee', 'Manager'] // If manager wants to see their own plan
      },
      {
        label: 'Değerlendirme Anketleri',
        path: '/dashboard/my-surveys',
        icon: ClipboardList,
        roles: ['Admin', 'HR', 'Manager', 'Employee']
      }
    ];

    return items.filter((item) => item.roles.includes(user.role));
  };

  const navItems = getNavItems();

  return (
    <RouteGuard>
      <div className="flex min-h-screen bg-background">
        {/* Left Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-card-border bg-card">
          {/* Logo Brand Header */}
          <div className="flex h-20 items-center px-6 border-b border-card-border">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                <Shield className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-wider uppercase text-foreground">
                  360° AI Gelişim
                </span>
                <span className="block text-[10px] text-muted tracking-wider uppercase font-medium">
                  Performans & AI
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex w-full items-center space-x-3.5 rounded-xl px-4 py-3 text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/10'
                      : 'text-muted hover:bg-card-border hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User profile Summary Footer inside Sidebar */}
          <div className="border-t border-card-border p-4 bg-card/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                <User className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user?.fullName}
                </p>
                <p className="truncate text-[10px] text-muted">{user?.email}</p>
              </div>
              <span className="shrink-0 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                {user?.role}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-danger/20 bg-danger/5 hover:bg-danger/10 py-2.5 text-xs font-semibold text-danger transition duration-150"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="pl-72 flex flex-1 flex-col">
          {/* Top Bar Header */}
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-card-border bg-background/80 px-8 backdrop-blur-md">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {pathname === '/dashboard' ? 'Genel Bakış' : navItems.find((n) => n.path === pathname)?.label || 'Panel'}
            </h2>

            {/* Health widget and credentials info */}
            <div className="flex items-center space-x-6">
              {/* System Health Indicators */}
              <div className="flex items-center space-x-3.5 rounded-2xl bg-card border border-card-border px-4 py-2 text-xs">
                {apiClient.isMock ? (
                  <span className="flex items-center text-warning font-semibold space-x-1.5">
                    <Database className="h-4 w-4 shrink-0" />
                    <span>MOCK MODU</span>
                  </span>
                ) : (
                  <>
                    <span className="flex items-center space-x-1.5 text-muted">
                      <Cpu className="h-4 w-4 shrink-0" />
                      <span>Sistem Durumu:</span>
                    </span>

                    {/* API Status badge */}
                    <span className={`flex items-center space-x-1 font-semibold ${
                      healthStatus.api === 'ok' ? 'text-success' : 
                      healthStatus.api === 'checking' ? 'text-warning' : 'text-danger'
                    }`}>
                      {healthStatus.api === 'ok' ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : healthStatus.api === 'checking' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>API</span>
                    </span>

                    {/* ML Status badge */}
                    <span className={`flex items-center space-x-1 font-semibold ${
                      healthStatus.ml === 'ok' ? 'text-success' : 
                      healthStatus.ml === 'checking' ? 'text-warning' :
                      healthStatus.ml === 'not-loaded' ? 'text-warning' : 'text-danger'
                    }`}>
                      {healthStatus.ml === 'ok' ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : healthStatus.ml === 'checking' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : healthStatus.ml === 'not-loaded' ? (
                        <XCircle className="h-3.5 w-3.5 opacity-50" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>AI Model</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Core Page Content wrapper */}
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}
