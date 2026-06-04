'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../../store/useStore';
import { apiClient } from '../../../services/apiClient';
import { EmployeeDetail } from '../../../types';
import {
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Play,
  ExternalLink
} from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useStore();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.employees.list(page, pageSize);
      if (res.success) {
        // Apply client-side filters for search and department (since backend mock lists all)
        let filtered = res.data;
        
        if (searchTerm) {
          filtered = filtered.filter((e) =>
            e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        if (selectedDept) {
          filtered = filtered.filter((e) => e.department === selectedDept);
        }

        setEmployees(filtered);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Error fetching employees list', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchEmployees();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, selectedDept]);

  const handleStartAssessment = async (empId: number) => {
    if (confirm('Bu çalışan için yeni bir 360° yetkinlik değerlendirmesi başlatmak istiyor musunuz?')) {
      try {
        const res = await apiClient.assessments.create(empId, 1); // default cycleId = 1
        if (res.success && res.data) {
          alert('Değerlendirme başarıyla oluşturuldu. Şimdi puanları girmek için yönlendirileceksiniz.');
          router.push(`/dashboard/employee/${empId}`);
        } else {
          alert(res.message || 'Değerlendirme başlatılamadı.');
        }
      } catch (err) {
        console.error('Error creating assessment', err);
        const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'İşlem başarısız oldu.';
        alert(errMsg);
      }
    }
  };

  const departments = [
    'Human Resources',
    'Technology',
    'Sales & Marketing',
    'Finance & Accounting',
    'Operations'
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">Çalışan Listesi</h3>
          <p className="text-xs text-muted mt-0.5">Yetkinliklerini analiz etmek istediğiniz çalışanı seçin veya değerlendirme başlatın.</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="İsim veya çalışan kodu ile ara..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl bg-card border border-card-border py-3 pr-4 pl-12 text-sm text-foreground placeholder-muted outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Department Filter dropdown */}
        <div className="relative w-full md:w-64">
          <Filter className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl bg-card border border-card-border py-3 pr-4 pl-12 text-sm text-foreground placeholder-muted outline-none appearance-none cursor-pointer focus:border-primary"
          >
            <option value="">Tüm Departmanlar</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'Human Resources' ? 'İnsan Kaynakları' :
                 dept === 'Technology' ? 'Teknoloji' :
                 dept === 'Sales & Marketing' ? 'Satış & Pazarlama' :
                 dept === 'Finance & Accounting' ? 'Finans & Muhasebe' : 'Operasyon'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel rounded-2xl border border-card-border overflow-hidden">
        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted">
            Aradığınız kriterlere uygun çalışan bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border bg-card/30 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="py-4.5 px-6">Kod</th>
                  <th className="py-4.5 px-6">Ad Soyad</th>
                  <th className="py-4.5 px-6">Pozisyon</th>
                  <th className="py-4.5 px-6">Departman</th>
                  <th className="py-4.5 px-6">Skor</th>
                  <th className="py-4.5 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-card/20 transition">
                    <td className="py-4 px-6 text-sm font-semibold text-primary">{emp.employeeCode}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          {emp.fullName[0]}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{emp.fullName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted">{emp.jobRole}</td>
                    <td className="py-4 px-6 text-sm text-muted">{emp.department}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center space-x-1 font-bold text-sm text-success">
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        <span>{emp.performanceScore || '3.5'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {/* Only HR/Manager can start evaluation */}
                      {(user?.role === 'HR' || user?.role === 'Manager') && (
                        <button
                          onClick={() => handleStartAssessment(emp.id)}
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-warning/20 bg-warning/5 hover:bg-warning/10 py-1.5 px-3 text-xs font-bold text-warning transition duration-150"
                        >
                          <Play className="h-3 w-3 shrink-0" />
                          <span>360 Başlat</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => router.push(`/dashboard/employee/${emp.id}`)}
                        className="inline-flex items-center space-x-1.5 rounded-lg bg-primary hover:bg-primary-hover py-1.5 px-3 text-xs font-bold text-white shadow-sm shadow-primary/10 transition duration-150"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span>Analiz ve Plan</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted">
            Toplam {totalCount} çalışandan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} arası gösteriliyor.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-card-border text-muted hover:text-foreground disabled:opacity-50 transition duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold px-3 text-foreground">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-card-border text-muted hover:text-foreground disabled:opacity-50 transition duration-150"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
