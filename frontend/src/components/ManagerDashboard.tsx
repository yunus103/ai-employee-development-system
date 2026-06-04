'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store/useStore';
import { apiClient } from '../services/apiClient';
import { EmployeeDetail, Assessment, ActionPlan } from '../types';
import {
  Users,
  ClipboardList,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function ManagerDashboard() {
  const router = useRouter();
  const { user } = useStore();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch employees
        const empRes = await apiClient.employees.list(1, 100);
        if (empRes.success) {
          setEmployees(empRes.data);
          
          // For each team member, fetch assessments and plans
          const allAssessments: Assessment[] = [];
          const allPlans: ActionPlan[] = [];
          
          for (const emp of empRes.data) {
            const assRes = await apiClient.employees.getAssessments(emp.id, 1, 50);
            if (assRes.success) {
              allAssessments.push(...assRes.data);
            }
            const planRes = await apiClient.employees.getActionPlans(emp.id);
            if (planRes.success) {
              allPlans.push(...planRes.data);
            }
          }
          
          setAssessments(allAssessments);
          setPlans(allPlans);
        }
      } catch (err) {
        console.error('Error fetching manager dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Stats calculation
  const totalTeam = employees.filter((e) => e.id !== user?.employeeId).length; // exclude self if listed
  const draftAssessments = assessments.filter((a) => a.status === 'Draft').length;
  const completedAssessments = assessments.filter((a) => a.status === 'Completed').length;
  const generatedPlans = plans.filter((p) => p.status === 'Draft' || p.status === 'Edited').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome & Info */}
      <div className="rounded-3xl bg-gradient-to-r from-info/10 via-info/5 to-transparent border border-info/10 p-8 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">Yönetici Paneli — {user?.fullName}</h3>
          <p className="mt-2 text-sm text-muted">
            Ekibinin yetkinlik değerlendirmelerini yapabilir, AI destekli gelişim planlarını yönetebilir ve ilerlemelerini izleyebilirsin.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/employees')}
          className="mt-4 md:mt-0 flex items-center space-x-2 rounded-xl bg-info hover:bg-info/80 px-5 py-3 text-sm font-semibold text-white transition duration-150"
        >
          <span>Ekibimi Yönet</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total team members */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Ekip Büyüklüğü</span>
            <div className="rounded-xl bg-info/10 p-2 text-info border border-info/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{totalTeam}</span>
            <span className="block text-xs text-muted mt-1">Doğrudan Bağlı Çalışan</span>
          </div>
        </div>

        {/* Draft assessments */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Puanlama Bekleyen</span>
            <div className="rounded-xl bg-warning/10 p-2 text-warning border border-warning/20">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{draftAssessments}</span>
            <span className="block text-xs text-muted mt-1">Aktif Değerlendirme Formu</span>
          </div>
        </div>

        {/* Completed assessments */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Tamamlanan Analizler</span>
            <div className="rounded-xl bg-success/10 p-2 text-success border border-success/20">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{completedAssessments}</span>
            <span className="block text-xs text-muted mt-1">Puanlaması Biten Çalışan</span>
          </div>
        </div>

        {/* Generated Plans */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Plan Onayları</span>
            <div className="rounded-xl bg-primary/10 p-2 text-primary border border-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-foreground">{generatedPlans}</span>
            <span className="block text-xs text-muted mt-1">Taslak Aksiyon Planı</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Direct Reports & Pending Actions */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left Column: Direct Reports List */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-bold text-foreground">Doğrudan Bağlı Ekip</h4>
              <p className="text-xs text-muted mt-0.5">Ekibindeki çalışanların genel bilgileri ve performans durumları.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/employees')}
              className="text-xs font-semibold text-info hover:underline"
            >
              Ekibe Git
            </button>
          </div>

          <div className="space-y-4">
            {employees.length > 0 ? (
              employees
                .filter((e) => e.id !== user?.employeeId)
                .slice(0, 4)
                .map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => router.push(`/dashboard/employee/${emp.id}`)}
                    className="glass-card hover:bg-card-border/50 cursor-pointer rounded-xl p-4 border border-card-border flex items-center justify-between transition duration-150"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info font-bold">
                        {emp.fullName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{emp.fullName}</p>
                        <p className="text-xs text-muted">{emp.jobRole} • {emp.department}</p>
                        {(() => {
                          const empActivePlan = plans.find(p => p.employeeId === emp.id && (p.status === 'Sent' || p.status === 'Completed'));
                          if (empActivePlan) {
                            const completedCount = empActivePlan.items.filter(i => i.taskStatus === 'Completed').length;
                            return (
                              <p className="text-[10px] text-primary font-semibold mt-1">
                                İlerleme: {completedCount}/{empActivePlan.items.length} Görev Bitti
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <span className="rounded-md bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info">
                      Skor: {emp.performanceScore || '3.5'}
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-center p-8 text-sm text-muted">
                Bağlı çalışan bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Assessments & Plans */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-card-border flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-foreground">Bekleyen İşlemler</h4>
            <p className="text-xs text-muted mt-0.5">Hızlıca aksiyon alabileceğin kritik İK süreçleri.</p>
          </div>

          <div className="mt-6 flex-1 space-y-4 max-h-[300px] overflow-y-auto">
            {assessments.filter((a) => a.status === 'Draft').map((ass) => (
              <div key={ass.id} className="glass-card rounded-xl p-4 border border-card-border flex flex-col space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted uppercase font-bold">Puanlama Bekleniyor</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{ass.employeeName}</p>
                  </div>
                  <AlertCircle className="h-4 w-4 text-warning" />
                </div>
                <button
                  onClick={() => router.push(`/dashboard/employee/${ass.employeeId}`)}
                  className="flex items-center justify-center space-x-1.5 rounded-lg bg-warning/10 hover:bg-warning/20 border border-warning/20 py-2 text-xs font-semibold text-warning transition duration-150"
                >
                  <span>Anketi Doldur</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {assessments.filter((a) => a.status === 'Completed').map((ass) => (
              <div key={ass.id} className="glass-card rounded-xl p-4 border border-card-border flex flex-col space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted uppercase font-bold">AI Plan Hazır</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{ass.employeeName}</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-success" />
                </div>
                <button
                  onClick={() => router.push(`/dashboard/employee/${ass.employeeId}`)}
                  className="flex items-center justify-center space-x-1.5 rounded-lg bg-success/10 hover:bg-success/20 border border-success/20 py-2 text-xs font-semibold text-success transition duration-150"
                >
                  <span>Plan Üret / Onayla</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {assessments.filter((a) => a.status === 'Draft').length === 0 &&
             assessments.filter((a) => a.status === 'Completed').length === 0 && (
              <div className="text-center p-8 text-xs text-muted">
                Herhangi bir işlem bekleyen değerlendirme bulunmamaktadır. Tüm süreçler güncel!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
