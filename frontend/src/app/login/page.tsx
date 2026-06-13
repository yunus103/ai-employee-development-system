'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { Shield, Mail, Lock, AlertCircle, ArrowRight, User, X, Building2, Key, HelpCircle, Users } from 'lucide-react';
import demoUsersRaw from '../../data/demo_users.json';

interface DemoUser {
  id: number;
  fullName: string;
  email: string;
  department: string;
  jobRole: string;
  managerId: number | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, checkAuth } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('System');

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Check for session expiry parameter and display warning
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const expired = params.get('expired') === 'true';
      const msg = params.get('message');
      
      if (expired) {
        setError(msg ? decodeURIComponent(msg) : 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
        // Clean query parameter from browser address bar
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('E-posta adresi gereklidir.');
      return;
    }

    setError(null);
    setFormLoading(true);
    const res = await login(email, password);
    setFormLoading(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setIsModalOpen(false);
    setError(null);
    setFormLoading(true);
    const res = await login(demoEmail, demoPass);
    setFormLoading(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.message);
    }
  };

  const systemUsers = [
    { 
      label: 'Sistem Yöneticisi (Admin)', 
      email: 'admin@demo.com', 
      pass: 'Admin1234!', 
      color: 'border-danger/30 hover:border-danger text-danger',
      desc: 'Veritabanındaki tüm verileri silip, 20 kişilik simüle şirket verilerini (tohum verilerini) yeniden yükleme yetkisine sahiptir.' 
    },
    { 
      label: 'İnsan Kaynakları (HR)', 
      email: 'hr@demo.com', 
      pass: 'Hr1234!', 
      color: 'border-primary/30 hover:border-primary text-primary',
      desc: 'Şirket genelindeki tüm çalışan değerlendirmelerini, gelişim planlarını yönetebilir ve yeni değerlendirme süreçleri başlatabilir.' 
    }
  ];

  const demoEmployees: DemoUser[] = demoUsersRaw as DemoUser[];

  // Dynamic departments list
  const departments = ['System', 'All', ...Array.from(new Set(demoEmployees.map(u => u.department)))];

  // Filtered employees based on active tab
  const filteredEmployees = activeTab === 'All' 
    ? demoEmployees 
    : demoEmployees.filter(u => u.department === activeTab);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Decorative Blur Spheres */}
      <div className="absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px]"></div>
      <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-info/10 blur-[120px]"></div>

      <div className="z-10 w-full max-w-md">
        {/* Brand Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            360° AI Gelişim Planı
          </h1>
          <p className="mt-2 text-sm text-muted">
            Yapay Zeka Destekli Yetkinlik ve Gelişim Platformu
          </p>
        </div>

        {/* Login Panel */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Giriş Yapın</h2>

          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger animate-fadeIn">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={formLoading || isLoading}
                  className="w-full rounded-xl bg-card border border-card-border py-3.5 pr-4 pl-12 text-sm text-foreground placeholder-muted outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={formLoading || isLoading}
                  className="w-full rounded-xl bg-card border border-card-border py-3.5 pr-4 pl-12 text-sm text-foreground placeholder-muted outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={formLoading || isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-primary hover:bg-primary-hover py-3.5 px-4 font-semibold text-white shadow-lg shadow-primary/20 transition duration-150 disabled:opacity-50"
            >
              {formLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <span className="flex items-center">
                  Giriş Yap <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Login Section */}
          <div className="mt-8 text-center">
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-card-border"></div>
              <span className="flex-shrink mx-4 text-xs text-muted uppercase tracking-wider">Test & Demo</span>
              <div className="flex-grow border-t border-card-border"></div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={formLoading || isLoading}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-primary/30 hover:border-primary hover:bg-primary/5 py-3 px-4 text-sm font-semibold text-primary transition duration-150"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Hızlı Demo Girişi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Users Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-3xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl border border-card-border overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-card-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Hızlı Demo Girişi</h3>
                <p className="text-xs text-muted mt-1">İstediğiniz rol veya çalışan kartına tıklayarak şifresiz giriş yapabilirsiniz.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-9 w-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 py-3 bg-card/30 border-b border-card-border flex flex-wrap gap-2">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveTab(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    activeTab === dept
                      ? 'bg-primary text-white'
                      : 'text-muted hover:text-foreground hover:bg-card border border-card-border'
                  }`}
                >
                  {dept === 'System' ? 'Sistem Rolleri' : dept === 'All' ? 'Tüm Çalışanlar' : dept}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              {activeTab === 'System' ? (
                <div className="space-y-4">
                  {systemUsers.map((user) => (
                    <div 
                      key={user.email}
                      onClick={() => handleQuickLogin(user.email, user.pass)}
                      className="group cursor-pointer rounded-2xl border border-card-border bg-card/30 p-5 hover:border-primary hover:bg-primary/5 transition flex items-start gap-4"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Key className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition">{user.label}</h4>
                          <span className="text-xs text-muted font-mono">{user.email}</span>
                        </div>
                        <p className="text-xs text-muted mt-2 bg-card p-3 rounded-lg border border-card-border leading-relaxed flex items-start gap-2">
                          <HelpCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <span>{user.desc}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEmployees.map((emp) => {
                    const isManager = emp.managerId === null;
                    return (
                      <div
                        key={emp.email}
                        onClick={() => handleQuickLogin(emp.email, 'Demo1234!')}
                        className="group cursor-pointer rounded-xl border border-card-border bg-card/30 p-4 hover:border-primary hover:bg-primary/5 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isManager ? 'bg-info/10 text-info border border-info/20' : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition">{emp.fullName}</h4>
                            <p className="text-[10px] text-muted mt-0.5">{emp.jobRole}</p>
                            <p className="text-[9px] text-muted font-mono mt-1">{emp.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isManager 
                              ? 'bg-info/15 text-info' 
                              : 'bg-card border border-card-border text-muted'
                          }`}>
                            {isManager ? 'Manager' : 'Employee'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-card/20 border-t border-card-border flex items-center justify-between text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Dinamik departman ve çalışan yönetimi etkindir.
              </span>
              <span>
                Şifre: <span className="font-mono bg-card px-1.5 py-0.5 rounded text-foreground font-bold">Demo1234!</span>
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

