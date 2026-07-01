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
  Loader2,
  Menu,
  X
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

  // Pending surveys state
  const [pendingSurveyCount, setPendingSurveyCount] = useState<number>(0);

  // Mobile sidebar open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPendingSurveys = async () => {
      try {
        const res = await apiClient.tasks.getMySurveys();
        if (res.success) {
          setPendingSurveyCount(res.data.length);
        }
      } catch (err) {
        // Suppress errors to keep terminal clean
      }
    };
    fetchPendingSurveys();
    const interval = setInterval(fetchPendingSurveys, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const checkSystemHealth = async () => {
      if (apiClient.isMock) {
        setHealthStatus({ api: 'ok', ml: 'ok' });
        return;
      }

      // --- Check Backend API ---
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          // Backend returns: { success: true, data: { status: 'healthy'|'degraded'|..., database: ... } }
          if (json.success && json.data?.status) {
            const s = json.data.status.toLowerCase();
            const apiState = s === 'healthy' || s === 'ok' ? 'ok' : s === 'degraded' ? 'ok' : 'error';
            setHealthStatus(prev => ({ ...prev, api: apiState }));
          } else {
            setHealthStatus(prev => ({ ...prev, api: 'ok' }));
          }
        } else {
          setHealthStatus(prev => ({ ...prev, api: 'error' }));
        }
      } catch {
        setHealthStatus(prev => ({ ...prev, api: 'error' }));
      }

      // --- Check ML Service (via Next.js proxy /ml/* → bitirme-ml.onrender.com) ---
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 8000);
        const mlResponse = await fetch('/ml/health', { signal: controller2.signal });
        clearTimeout(timeoutId2);

        if (mlResponse.ok) {
          const mlJson = await mlResponse.json();
          // ML returns: { status: 'ok', model_loaded: true, encoder_loaded: true, ... }
          const mlOk = mlJson.status === 'ok' && mlJson.model_loaded === true;
          setHealthStatus(prev => ({ ...prev, ml: mlOk ? 'ok' : 'error' }));
        } else {
          setHealthStatus(prev => ({ ...prev, ml: 'error' }));
        }
      } catch {
        // ML might be sleeping — treat as not-loaded (yellow) not a hard error
        setHealthStatus(prev => ({ ...prev, ml: 'not-loaded' }));
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
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
        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-card-border bg-card transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-20 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Logo Brand Header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-card-border">
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
            {/* Close button for mobile sidebar */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-card-border lg:hidden transition"
              aria-label="Menüyü Kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/10'
                      : 'text-muted hover:bg-card-border hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.path === '/dashboard/my-surveys' && pendingSurveyCount > 0 && (
                    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      isActive 
                        ? 'bg-white text-primary' 
                        : 'bg-primary text-white'
                    }`}>
                      {pendingSurveyCount}
                    </span>
                  )}
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
              onClick={() => {
                handleLogout();
                setIsSidebarOpen(false);
              }}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-danger/20 bg-danger/5 hover:bg-danger/10 py-2.5 text-xs font-semibold text-danger transition duration-150"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="lg:pl-72 flex flex-1 flex-col w-full min-w-0">
          {/* Top Bar Header */}
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-card-border bg-background/80 px-4 sm:px-8 backdrop-blur-md">
            <div className="flex items-center min-w-0">
              {/* Hamburger Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="mr-3 p-2 text-muted hover:text-foreground rounded-xl hover:bg-card-border lg:hidden transition"
                aria-label="Menüyü Aç"
              >
                <Menu className="h-5.5 w-5.5" />
              </button>
              <h2 className="text-xl font-bold tracking-tight text-foreground truncate">
                {pathname === '/dashboard' ? 'Genel Bakış' : navItems.find((n) => n.path === pathname)?.label || 'Panel'}
              </h2>
            </div>

            {/* Health widget and credentials info */}
            <div className="flex items-center space-x-6 shrink-0">
              {/* System Health Indicators */}
              <div className="flex items-center space-x-3.5 rounded-2xl bg-card border border-card-border px-3.5 py-2 text-xs">
                {apiClient.isMock ? (
                  <span className="flex items-center text-warning font-semibold space-x-1.5">
                    <Database className="h-4 w-4 shrink-0" />
                    <span>MOCK MODU</span>
                  </span>
                ) : (
                  <>
                    <span className="hidden sm:flex items-center space-x-1.5 text-muted">
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
                      <span>AI<span className="hidden md:inline"> Model</span></span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Core Page Content wrapper */}
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}
