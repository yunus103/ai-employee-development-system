'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store/useStore';
import { apiClient } from '../services/apiClient';
import { EmployeeDetail } from '../types';
import {
  Layers,
  Users,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export default function HRDashboard() {
  const router = useRouter();
  const { user } = useStore();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const empRes = await apiClient.employees.list(1, 100);
        if (empRes.success) {
          setEmployees(empRes.data);
        }
      } catch (err) {
        console.error('Error fetching HR stats', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Calculate global metrics
  const totalEmployees = employees.length;
  const avgPerformance = employees.length > 0
    ? (employees.reduce((acc, curr) => acc + (curr.performanceScore || 0), 0) / totalEmployees).toFixed(2)
    : '0.00';

  // Group by department
  const depts = Array.from(new Set(employees.map(e => e.department)));
  const departmentStats = depts.map(deptName => {
    const list = employees.filter(e => e.department === deptName);
    const avgScore = (list.reduce((acc, curr) => acc + (curr.performanceScore || 0), 0) / list.length).toFixed(2);
    return {
      name: deptName,
      count: list.length,
      avg: avgScore
    };
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">İK Yönetim Paneli — {user?.fullName}</h3>
          <p className="mt-2 text-sm text-muted">
            Kurum genelindeki tüm çalışan yetkinlik puanlarını, değerlendirmeleri ve gelişim süreçlerini buradan izleyebilirsin.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/employees')}
          className="mt-4 md:mt-0 flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-3 text-sm font-semibold text-white transition duration-150"
        >
          <span>Tüm Çalışanları Gör</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Toplam Çalışan</span>
            <div className="rounded-xl bg-primary/10 p-2 text-primary border border-primary/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{totalEmployees}</span>
            <span className="block text-xs text-muted mt-1">Aktif Şirket Kadrosu</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Ortalama Performans</span>
            <div className="rounded-xl bg-success/10 p-2 text-success border border-success/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{avgPerformance} / 5.0</span>
            <span className="block text-xs text-muted mt-1">Şirket Performans Endeksi</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Departman Sayısı</span>
            <div className="rounded-xl bg-info/10 p-2 text-info border border-info/20">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{depts.length}</span>
            <span className="block text-xs text-muted mt-1">Tanımlı Departman Yapısı</span>
          </div>
        </div>
      </div>

      {/* Department Breakdowns */}
      <div className="glass-panel rounded-2xl p-6 border border-card-border">
        <h4 className="text-base font-bold text-foreground mb-6">Departman Yetkinlik ve Yoğunluk Kırılımı</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {departmentStats.map((stat) => (
            <div key={stat.name} className="glass-card rounded-xl p-4 border border-card-border flex flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{stat.name}</p>
                <p className="text-xs text-muted mt-0.5">{stat.count} Çalışan Kayıtlı</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-card-border pt-3">
                <span className="text-xs text-muted">Ortalama Performans:</span>
                <span className="text-xs font-bold text-primary">{stat.avg} / 5.0</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
