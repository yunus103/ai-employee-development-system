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
  ArrowRight,
  PieChart as PieIcon,
  AlertTriangle,
  Clock,
  Briefcase
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function HRDashboard() {
  const router = useRouter();
  const { user } = useStore();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const empRes = await apiClient.employees.list(1, 100);
        if (empRes.success) {
          setEmployees(empRes.data);
        }
      } catch (err: any) {
        console.error('Error fetching HR stats:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Welcome Banner Skeleton */}
        <div className="h-32 bg-card-border/20 border border-card-border rounded-3xl"></div>
        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 border border-card-border h-36">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-card-border/30 rounded w-1/3"></div>
                <div className="h-8 w-8 bg-card-border/30 rounded-xl"></div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-8 bg-card-border/30 rounded w-1/2"></div>
                <div className="h-3 bg-card-border/30 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
        {/* Department Table Skeleton */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border h-80 space-y-4">
          <div className="h-6 bg-card-border/30 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-card-border/30 rounded-xl"></div>
            ))}
          </div>
        </div>
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

  // --- Analitik Hesaplamalar ---
  const totalWithRisk = employees.filter(e => e.attrition === 'Yes').length;
  const riskPercent = totalEmployees > 0 ? Math.round((totalWithRisk / totalEmployees) * 100) : 0;

  // 1. Kadro Departman Dağılımı (Pie Chart için)
  const deptDistributionData = departmentStats.map(stat => ({
    name: stat.name === 'Human Resources' ? 'İK' :
          stat.name === 'Sales & Marketing' ? 'Satış & Paz.' :
          stat.name === 'Finance & Accounting' ? 'Finans' :
          stat.name === 'Technology' ? 'Teknoloji' : stat.name,
    value: stat.count
  }));

  // 2. Departman Performans Ortalamaları (Bar Chart için)
  const deptPerformanceData = departmentStats.map(stat => ({
    name: stat.name === 'Human Resources' ? 'İK' :
          stat.name === 'Sales & Marketing' ? 'Satış' :
          stat.name === 'Finance & Accounting' ? 'Finans' :
          stat.name === 'Technology' ? 'Teknoloji' : stat.name,
    Performance: parseFloat(stat.avg)
  }));

  // 3. Departman Bazlı Attrition Dağılımı (Stacked Bar için)
  const deptAttritionData = depts.map(deptName => {
    const list = employees.filter(e => e.department === deptName);
    const yesCount = list.filter(e => e.attrition === 'Yes').length;
    const noCount = list.filter(e => e.attrition === 'No').length;
    return {
      name: deptName === 'Human Resources' ? 'İK' :
            deptName === 'Sales & Marketing' ? 'Satış' :
            deptName === 'Finance & Accounting' ? 'Finans' :
            deptName === 'Technology' ? 'Teknoloji' : deptName,
      'Riskli (Evet)': yesCount,
      'Normal (Hayır)': noCount
    };
  });

  // 4. Kıdem ve Performans İlişkisi (Bar Chart için)
  const expRanges = [
    { label: '0-2 Yıl', min: 0, max: 2 },
    { label: '3-5 Yıl', min: 3, max: 5 },
    { label: '6-10 Yıl', min: 6, max: 10 },
    { label: '10+ Yıl', min: 11, max: 100 }
  ];
  const expPerformanceData = expRanges.map(range => {
    const list = employees.filter(e => e.totalWorkingYears >= range.min && e.totalWorkingYears <= range.max);
    const avg = list.length > 0 ? (list.reduce((acc, curr) => acc + (curr.performanceScore || 0), 0) / list.length).toFixed(2) : '0.00';
    return {
      name: range.label,
      Performans: parseFloat(avg)
    };
  });

  const COLORS = ['#6366f1', '#06b6d4', '#eab308', '#10b981', '#f43f5e'];

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

      {/* Tab Switcher Bar */}
      <div className="flex border-b border-card-border pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-6 text-xs font-bold border-b-2 transition duration-150 ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Genel Bakış
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 px-6 text-xs font-bold border-b-2 transition duration-150 ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          İK Analitik Raporları
        </button>
      </div>

      {/* Mode 1: Overview Panel */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
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
      )}

      {/* Mode 2: Analytics Panel */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-panel rounded-2xl p-6 border border-card-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Kadro Dağılımı</span>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">{totalEmployees}</span>
                <span className="text-[10px] text-muted font-medium">Toplam Çalışan</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-card-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Kayıp (Attrition) Riski</span>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold ${totalWithRisk > 0 ? 'text-danger' : 'text-foreground'}`}>
                  %{riskPercent}
                </span>
                <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                  totalWithRisk > 0 ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'
                }`}>
                  {totalWithRisk} Kişi Riskli
                </span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-card-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Ortalama Deneyim</span>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {(employees.reduce((acc, curr) => acc + (curr.totalWorkingYears || 0), 0) / (totalEmployees || 1)).toFixed(1)} Yıl
                </span>
                <span className="text-[10px] text-muted font-medium">Toplam Sektör Deneyimi</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-card-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Yaş Ortalaması</span>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {(employees.reduce((acc, curr) => acc + (curr.age || 0), 0) / (totalEmployees || 1)).toFixed(1)} Yaş
                </span>
                <span className="text-[10px] text-muted font-medium">Şirket Yaş İndeksi</span>
              </div>
            </div>
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Chart 1: Department Distribution Pie Chart */}
            <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Kadro Departman Dağılımı</h4>
                <p className="text-[10px] text-muted mt-0.5">Departmanların çalışan sayısı bazında yüzdesel oranı.</p>
              </div>
              <div className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (%${((percent || 0) * 100).toFixed(0)})`}
                    >
                      {deptDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Performance Average Bar Chart */}
            <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Departman Performans İndeksi</h4>
                <p className="text-[10px] text-muted mt-0.5">Departmanların 5.0 üzerinden güncel performans skor ortalamaları.</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                    <YAxis stroke="#71717a" fontSize={11} domain={[0, 5]} />
                    <Tooltip contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="Performance" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={35} name="Skor" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Stacked Attrition Risk per Department */}
            <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Departman Bazlı Kayıp Riski Dağılımı</h4>
                <p className="text-[10px] text-muted mt-0.5">Yapay zeka modeli tarafından tespit edilen işten ayrılma riski oranı.</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptAttritionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />
                    <Bar dataKey="Normal (Hayır)" stackId="a" fill="#10b981" barSize={35} />
                    <Bar dataKey="Riskli (Evet)" stackId="a" fill="#f43f5e" barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Experience vs Performance Line Chart */}
            <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Kıdem ve Performans İlişkisi</h4>
                <p className="text-[10px] text-muted mt-0.5">Çalışanların toplam kıdem sürelerine göre performans skor ortalamaları.</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} domain={[0, 5]} />
                    <Tooltip contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="Performans" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
