'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store/useStore';
import { apiClient } from '../services/apiClient';
import { EmployeeTask, AssessmentScore, ActionPriority } from '../types';
import competencyMapping from '../data/competency_mapping.json';
import { formatCompetencyText } from '../utils/competencyFormatter';
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user } = useStore();
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<{ department: string; jobRole: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveCompetencyName = (code: string, name: string): string => {
    if (!code) return '';

    // 1. Core Competency mapping → short Turkish label
    if (code.startsWith('Core_')) {
      const coreLabels = (competencyMapping as any).core_labels;
      return coreLabels?.[code] || name || code;
    }

    // 2. Search in department mapping by resolved C# name or code
    const deptLabelsAll = (competencyMapping as any).dept_comp_labels;
    const deptDisplayAll = (competencyMapping as any).dept_comp_display_labels;

    for (const dept of Object.keys(deptLabelsAll)) {
      const deptLabels = deptLabelsAll[dept];
      const matchingKey = Object.keys(deptLabels).find(
        key => deptLabels[key] === name || deptLabels[key] === code
      );
      if (matchingKey && deptDisplayAll[dept]) {
        return deptDisplayAll[dept][matchingKey] || name || code;
      }
    }

    // 3. Search in role mapping by resolved C# name or code
    const roleLabelsAll = (competencyMapping as any).role_comp_labels;
    const roleDisplayAll = (competencyMapping as any).role_comp_display_labels;

    for (const role of Object.keys(roleLabelsAll)) {
      const roleLabels = roleLabelsAll[role];
      const matchingKey = Object.keys(roleLabels).find(
        key => roleLabels[key] === name || roleLabels[key] === code
      );
      if (matchingKey && roleDisplayAll[role]) {
        return roleDisplayAll[role][matchingKey] || name || code;
      }
    }

    return name || code;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.employeeId === null) return;
      setIsLoading(true);
      try {
        // Profile fetch removed to prevent 401 unauthorized loop for employees

        // Fetch tasks
        const taskRes = await apiClient.tasks.getMy(1, 100);
        if (taskRes.success) {
          setTasks(taskRes.data);
        }

        // Fetch plans (requires HrOrManager, might return 403 for standard Employee)
        try {
          const planRes = await apiClient.employees.getActionPlans(user.employeeId);
          if (planRes.success && planRes.data.length > 0) {
            // Get the latest plan's assessment scores for Radar chart
            const activePlan = planRes.data[0];
            const scoreRes = await apiClient.assessments.getScores(activePlan.assessmentId);
            if (scoreRes.success) {
              setScores(scoreRes.data);
            }
          }
        } catch (planErr) {
          console.warn('Action plans or scores are restricted for standard employees (403):', planErr);
        }
      } catch (err: any) {
        console.error('Error fetching employee data:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Welcome Banner Skeleton */}
        <div className="h-32 bg-card-border/20 border border-card-border rounded-3xl"></div>
        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
        {/* Two Column Grid Skeleton */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 glass-panel rounded-2xl p-6 border border-card-border h-96">
            <div className="h-6 bg-card-border/30 rounded w-1/3 mb-6"></div>
            <div className="h-72 bg-card-border/20 rounded-xl"></div>
          </div>
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-card-border h-96 space-y-4">
            <div className="h-6 bg-card-border/30 rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-card-border/30 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'InProgress').length;
  const pendingTasks = tasks.filter((t) => t.status === 'Pending').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Radar chart data preparation
  // Group evaluator scores to show average
  const radarData = scores.length > 0
    ? Array.from(new Set(scores.map(s => s.competencyCode))).map(code => {
        const matching = scores.filter(s => s.competencyCode === code);
        const name = scores.find(s => s.competencyCode === code)?.competencyName || code;
        const avgScore = matching.reduce((sum, s) => sum + s.score, 0) / matching.length;
        const displayName = resolveCompetencyName(code, name);
        
        return {
          subject: displayName,
          score: parseFloat(avgScore.toFixed(2)),
          fullMark: 5.0
        };
      })
    : [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">Merhaba, {user?.fullName}!</h3>
          <p className="mt-2 text-sm text-muted">
            Kişisel gelişim hedeflerini, atanan aksiyon planlarını ve 360° değerlendirme durumunu buradan takip edebilirsin.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/employee-plan')}
          className="mt-4 md:mt-0 flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-3 text-sm font-semibold text-white transition duration-150"
        >
          <span>Gelişim Planını Gör</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Gelişim Oranı</span>
            <div className="rounded-xl bg-primary/10 p-2 text-primary border border-primary/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">%{progressPercent}</span>
            <span className="text-xs text-muted">
              {completedTasks}/{totalTasks} Görev Bitti
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-4 h-1.5 w-full rounded-full bg-card-border overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Devam Edenler</span>
            <div className="rounded-xl bg-warning/10 p-2 text-warning border border-warning/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{inProgressTasks}</span>
            <span className="text-xs text-muted">Gelişim Görevi</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Tamamlananlar</span>
            <div className="rounded-xl bg-success/10 p-2 text-success border border-success/20">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{completedTasks}</span>
            <span className="text-xs text-muted">Aksiyon Tamamlandı</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Bekleyenler</span>
            <div className="rounded-xl bg-info/10 p-2 text-info border border-info/20">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{pendingTasks}</span>
            <span className="text-xs text-muted">Başlanmamış Görev</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart + Tasks List Preview */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left Column: Radar Chart */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-6 border border-card-border flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-foreground">360° Yetkinlik Profili</h4>
            <p className="mt-1 text-xs text-muted">Son değerlendirme döngüsünde oluşan birleşik yetkinlik skorların.</p>
          </div>
          <div className="mt-6 flex h-80 items-center justify-center">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#71717a' }} stroke="#27272a" />
                  <Radar name="Skor" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <AlertCircle className="h-10 w-10 text-muted" />
                <p className="text-sm text-muted max-w-xs">
                  Henüz bir değerlendirme tamamlanmadığı için yetkinlik grafiğin çizilemiyor.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tasks Preview */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-card-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-foreground">Gelişim Aksiyonları</h4>
              <button
                onClick={() => router.push('/dashboard/employee-plan')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tümünü Gör
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">Devam eden gelişim planına ait en son aksiyonlar.</p>
          </div>

          <div className="mt-6 flex-1 space-y-3.5 overflow-y-auto max-h-[300px]">
            {tasks.length > 0 ? (
              (() => {
                const priorityWeights: Record<ActionPriority, number> = { High: 3, Medium: 2, Low: 1 };
                const sortedTasks = [...tasks].sort((a, b) => {
                  const isCompletedA = a.status === 'Completed';
                  const isCompletedB = b.status === 'Completed';
                  if (isCompletedA && !isCompletedB) return 1;
                  if (!isCompletedA && isCompletedB) return -1;

                  const weightA = priorityWeights[a.priority] || 0;
                  const weightB = priorityWeights[b.priority] || 0;
                  return weightB - weightA;
                });
                return sortedTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="glass-card rounded-xl p-4 border border-card-border flex items-start space-x-3.5">
                    <div className={`mt-1 flex h-2 w-2 shrink-0 rounded-full ${
                      task.status === 'Completed'
                        ? 'bg-success'
                        : task.status === 'InProgress'
                        ? 'bg-warning'
                        : 'bg-primary'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{formatCompetencyText(task.title, employeeProfile?.department, employeeProfile?.jobRole)}</p>
                      <p className="truncate text-xs text-muted mt-0.5">{formatCompetencyText(task.description, employeeProfile?.department, employeeProfile?.jobRole)}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      task.priority === 'High'
                        ? 'bg-danger/10 border border-danger/20 text-danger'
                        : task.priority === 'Medium'
                        ? 'bg-warning/10 border border-warning/20 text-warning'
                        : 'bg-muted/10 border border-muted/20 text-muted'
                    }`}>
                      {task.priority === 'High' ? 'Yüksek' : task.priority === 'Medium' ? 'Orta' : 'Düşük'}
                    </span>
                  </div>
                ));
              })()
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 h-full">
                <ClipboardList className="h-10 w-10 text-muted" />
                <p className="text-xs text-muted">
                  Henüz atanan bir gelişim görevi bulunmamaktadır.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
