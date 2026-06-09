'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { Shield, Mail, Lock, AlertCircle, ArrowRight, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, checkAuth } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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

  const demoUsers = [
    { label: 'Sistem Yöneticisi (Admin)', email: 'admin@demo.com', pass: 'Admin1234!', color: 'border-danger/30 hover:border-danger text-danger' },
    { label: 'İnsan Kaynakları (HR)', email: 'hr@demo.com', pass: 'Hr1234!', color: 'border-primary/30 hover:border-primary text-primary' },
    { label: 'Takım Yöneticisi (Manager)', email: 'manager@demo.com', pass: 'Manager1234!', color: 'border-info/30 hover:border-info text-info' },
    { label: 'Çalışan (Employee)', email: 'employee@demo.com', pass: 'Employee1234!', color: 'border-success/30 hover:border-success text-success' }
  ];

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
          <div className="mt-8">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-card-border"></div>
              <span className="flex-shrink mx-4 text-xs text-muted uppercase tracking-wider">Hızlı Demo Girişi</span>
              <div className="flex-grow border-t border-card-border"></div>
            </div>

            <div className="mt-4 space-y-2">
              {demoUsers.map((user) => (
                <button
                  key={user.email}
                  onClick={() => handleQuickLogin(user.email, user.pass)}
                  disabled={formLoading || isLoading}
                  className={`flex w-full items-center justify-between rounded-xl border bg-card/50 py-3 px-4 text-left text-xs font-medium transition duration-150 ${user.color}`}
                >
                  <span className="flex items-center">
                    <User className="mr-2 h-4 w-4 shrink-0" />
                    {user.label}
                  </span>
                  <span className="opacity-60">{user.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
