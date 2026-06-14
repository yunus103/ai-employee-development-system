'use client';

import { useEffect, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { apiClient } from '../../../services/apiClient';
import { EmployeeTask, TaskStatus, ActionPriority } from '../../../types';
import { toast } from '../../../store/useToastStore';
import {
  Clock,
  CheckCircle,
  Play,
  ClipboardList,
  AlertCircle,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  Search,
  FileDown,
  X
} from 'lucide-react';
import { formatCompetencyText } from '../../../utils/competencyFormatter';

export default function EmployeePlanPage() {
  const { user } = useStore();
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Todo' | 'InProgress' | 'Completed'>('All');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<{ department: string; jobRole: string } | null>(null);

  const isTaskOverdue = (dueDateStr: string | null | undefined, statusStr: string | null | undefined): boolean => {
    if (!dueDateStr || statusStr === 'Completed' || statusStr === 'Cancelled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDateStr);
    return taskDate < today;
  };

  const isTaskDueSoon = (dueDateStr: string | null | undefined, statusStr: string | null | undefined): boolean => {
    if (!dueDateStr || statusStr === 'Completed' || statusStr === 'Cancelled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDateStr);
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.tasks.getMy(1, 100);
      if (res.success) {
        setTasks(res.data);
      } else {
        setError('Görevler yüklenemedi.');
      }
    } catch (err: any) {
      // Suppressed console error to keep developer terminal clean
      setError(err.response?.data?.message || 'Görevler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user || user.employeeId === null) return;
    
    // If Manager, try to get self from the employees list first to avoid 401 authorization failure
    if (user.role === 'Manager') {
      try {
        const listRes = await apiClient.employees.list(1, 100);
        if (listRes.success && listRes.data.length > 0) {
          const selfEmp = listRes.data.find((e) => e.id === user.employeeId);
          if (selfEmp) {
            setEmployeeProfile({
              department: selfEmp.department,
              jobRole: selfEmp.jobRole
            });
            return;
          }
          // Fallback to first team member's department if manager self record not in list
          const firstTeam = listRes.data.find((e) => e.id !== user.employeeId);
          if (firstTeam) {
            setEmployeeProfile({
              department: firstTeam.department,
              jobRole: firstTeam.jobRole
            });
            return;
          }
        }
      } catch (listErr) {
        // Suppressed console error to keep developer terminal clean
      }
    }

    // Employee direct fetch disabled to prevent 401 loop. Fallback/Heuristics used instead.
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchTasks();
        fetchProfile();
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    try {
      const res = await apiClient.tasks.updateStatus(taskId, newStatus);
      if (res.success) {
        toast.success('Görev durumu güncellendi.');
        // Reload tasks list
        await fetchTasks();
        // Update selected task if open in modal
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) =>
            prev ? { ...prev, status: newStatus, completedAt: newStatus === 'Completed' ? new Date().toISOString() : null } : null
          );
        }
      } else {
        toast.error(res.message || 'Durum güncellenirken bir hata oluştu.');
      }
    } catch (err: any) {
      // Suppressed console error to keep developer terminal clean
      toast.error(err.response?.data?.message || err.message || 'İşlem başarısız oldu.');
    }
  };

  const handleDownloadPdf = async () => {
    const actionPlanId = tasks.find((t) => t.actionPlanId)?.actionPlanId;
    if (!actionPlanId) {
      toast.error('Aktif gelişim planınız bulunamadı veya henüz atama yapılmamış.');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const blob = await apiClient.actionPlans.exportPdf(actionPlanId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gelisim-plani-${actionPlanId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Gelişim planı PDF olarak indirildi.');
    } catch (err: any) {
      toast.error('PDF indirme başarısız oldu.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Sort tasks by priority (High -> Medium -> Low)
  const priorityWeights: Record<ActionPriority, number> = { High: 3, Medium: 2, Low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const weightA = priorityWeights[a.priority] || 0;
    const weightB = priorityWeights[b.priority] || 0;
    return weightB - weightA;
  });

  // Filter tasks based on Search Query
  const filteredTasks = sortedTasks.filter((task) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      (task.resource && task.resource.toLowerCase().includes(query)) ||
      (task.deliveryType && task.deliveryType.toLowerCase().includes(query))
    );
  });

  // Group tasks into buckets
  const todoTasks = filteredTasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'InProgress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'Completed');

  // Stats (based on original tasks list)
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const renderPriorityBadge = (priority: ActionPriority) => {
    let colorClasses = 'bg-muted/10 border-muted/20 text-muted';
    if (priority === 'High') {
      colorClasses = 'bg-danger/10 border-danger/20 text-danger';
    } else if (priority === 'Medium') {
      colorClasses = 'bg-warning/10 border-warning/20 text-warning';
    }
    return (
      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colorClasses}`}>
        {priority === 'High' ? 'Yüksek' : priority === 'Medium' ? 'Orta' : 'Düşük'}
      </span>
    );
  };

  const renderDueDateBadge = (task: EmployeeTask) => {
    if (task.status === 'Completed' || task.status === 'Cancelled' || !task.dueDate) return null;

    const overdue = isTaskOverdue(task.dueDate, task.status);
    const dueSoon = isTaskDueSoon(task.dueDate, task.status);

    if (overdue) {
      return (
        <span className="inline-flex items-center space-x-1 rounded bg-danger/10 border border-danger/20 px-1.5 py-0.5 text-[8px] font-bold text-danger uppercase tracking-wider animate-pulse">
          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          <span>Süresi Geçti</span>
        </span>
      );
    }

    if (dueSoon) {
      return (
        <span className="inline-flex items-center space-x-1 rounded bg-warning/15 border border-warning/30 px-1.5 py-0.5 text-[8px] font-bold text-warning uppercase tracking-wider">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          <span>Süre Az Kaldı</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center space-x-1 rounded bg-muted/10 border border-muted/20 px-1.5 py-0.5 text-[8px] font-bold text-muted uppercase tracking-wider">
        <span>Son Gün: {new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
      </span>
    );
  };

  const showTodo = selectedFilter === 'All' || selectedFilter === 'Todo';
  const showInProgress = selectedFilter === 'All' || selectedFilter === 'InProgress';
  const showCompleted = selectedFilter === 'All' || selectedFilter === 'Completed';

  const visibleColumnsCount = (showTodo ? 1 : 0) + (showInProgress ? 1 : 0) + (showCompleted ? 1 : 0);
  const gridColsClass =
    visibleColumnsCount === 3
      ? 'grid-cols-1 lg:grid-cols-3'
      : visibleColumnsCount === 2
      ? 'grid-cols-1 lg:grid-cols-2'
      : 'grid-cols-1';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">Kişisel Gelişim Planım</h3>
          <p className="text-xs text-muted mt-0.5">AI önerileri ile hazırlanan gelişim görevlerinin takibi.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {/* PDF Download Button */}
          {tasks.length > 0 && tasks.some((t) => t.actionPlanId) && (
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center justify-center space-x-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary px-4 py-3 text-xs font-bold transition disabled:opacity-50"
            >
              <FileDown className="h-4 w-4 shrink-0" />
              <span>{isDownloadingPdf ? 'İndiriliyor...' : 'Gelişim Planını PDF İndir'}</span>
            </button>
          )}

          {/* Progress Bar Widget */}
          <div className="flex items-center space-x-4 bg-card border border-card-border rounded-2xl px-5 py-2.5">
            <div className="text-right">
              <span className="text-[10px] text-muted font-medium block uppercase tracking-wider">İlerleme</span>
              <span className="text-lg font-bold text-foreground">%{progressPercent}</span>
            </div>
            {/* Progress Indicator Circle */}
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-card-border"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[9px] font-bold text-foreground">{completedCount}/{totalCount}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-3 rounded-xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      {tasks.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/30 border border-card-border/60 rounded-2xl p-4 glass-panel">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Görevlerde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-xs bg-card border border-card-border rounded-xl focus:outline-none focus:border-primary text-foreground transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {(
              [
                { key: 'All', label: 'Tümü' },
                { key: 'Todo', label: 'Yapılacaklar' },
                { key: 'InProgress', label: 'Devam Edenler' },
                { key: 'Completed', label: 'Tamamlananlar' },
              ] as const
            ).map((filter) => {
              const isActive = selectedFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition duration-150 ${
                    isActive
                      ? 'bg-primary border-primary text-white shadow-md'
                      : 'bg-card border-card-border hover:border-card-border/80 text-muted hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Board Grid */}
      {tasks.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-card-border max-w-lg mx-auto space-y-4">
          <ClipboardList className="h-16 w-16 mx-auto text-muted animate-pulse" />
          <h4 className="text-lg font-bold text-foreground">Aktif Plan Bulunmuyor</h4>
          <p className="text-sm text-muted">
            Şu anda atanmış aktif bir gelişim planınız yok. 360 derece değerlendirmeleriniz tamamlandıktan sonra yöneticiniz planınızı onaylayarak buraya iletecektir.
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${gridColsClass}`}>
          {/* Column 1: Assigned / Todo */}
          {showTodo && (
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col">
              <div className="flex items-center justify-between border-b border-card-border pb-3.5 mb-5">
                <span className="flex items-center space-x-2 text-sm font-bold text-foreground">
                  <BookOpen className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>Yapılacaklar</span>
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {todoTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {todoTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="glass-card rounded-xl p-5 border border-card-border space-y-4 transition hover:border-card-border/80 cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        {renderDueDateBadge(task)}
                        <h5 className="text-sm font-bold text-foreground leading-snug">{formatCompetencyText(task.title, employeeProfile?.department, employeeProfile?.jobRole)}</h5>
                      </div>
                      {renderPriorityBadge(task.priority)}
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">{formatCompetencyText(task.description, employeeProfile?.department, employeeProfile?.jobRole)}</p>

                    {/* Resource Link Card */}
                    {task.resource && (
                      <a
                        href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 px-3 py-2 transition text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-primary mb-0.5">
                            {task.deliveryType || 'Gelişim Kaynağı'}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground truncate block pr-2">
                            {task.resource}
                          </span>
                        </div>
                        <span className="flex items-center space-x-1 text-primary font-bold text-[10px] shrink-0 bg-primary/10 rounded-lg px-2 py-1">
                          <span>Aç</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    )}

                    {/* Action row */}
                    <div className="border-t border-card-border pt-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-muted font-medium">Atayan: {task.assignedByUserName}</span>
                      <button
                        onClick={() => handleStatusChange(task.id, 'InProgress')}
                        className="flex items-center space-x-1 rounded-lg bg-primary hover:bg-primary-hover py-1.5 px-3 text-xs font-semibold text-white transition duration-150"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Çalışmaya Başla</span>
                      </button>
                    </div>
                  </div>
                ))}
                {todoTasks.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted border border-dashed border-card-border rounded-xl">
                    Yapılacak görev bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Column 2: InProgress */}
          {showInProgress && (
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col">
              <div className="flex items-center justify-between border-b border-card-border pb-3.5 mb-5">
                <span className="flex items-center space-x-2 text-sm font-bold text-foreground">
                  <Clock className="h-4.5 w-4.5 text-warning shrink-0" />
                  <span>Devam Edenler</span>
                </span>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                  {inProgressTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {inProgressTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="glass-card rounded-xl p-5 border border-card-border space-y-4 transition hover:border-card-border/80 cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        {renderDueDateBadge(task)}
                        <h5 className="text-sm font-bold text-foreground leading-snug">{formatCompetencyText(task.title, employeeProfile?.department, employeeProfile?.jobRole)}</h5>
                      </div>
                      {renderPriorityBadge(task.priority)}
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">{formatCompetencyText(task.description, employeeProfile?.department, employeeProfile?.jobRole)}</p>

                    {/* Resource Link Card */}
                    {task.resource && (
                      <a
                        href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 px-3 py-2 transition text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-primary mb-0.5">
                            {task.deliveryType || 'Gelişim Kaynağı'}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground truncate block pr-2">
                            {task.resource}
                          </span>
                        </div>
                        <span className="flex items-center space-x-1 text-primary font-bold text-[10px] shrink-0 bg-primary/10 rounded-lg px-2 py-1">
                          <span>Aç</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    )}

                    {/* Action row */}
                    <div className="border-t border-card-border pt-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-muted font-medium">Atayan: {task.assignedByUserName}</span>
                      <button
                        onClick={() => handleStatusChange(task.id, 'Completed')}
                        className="flex items-center space-x-1 rounded-lg bg-success hover:bg-success/80 py-1.5 px-3 text-xs font-semibold text-white transition duration-150"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Tamamla</span>
                      </button>
                    </div>
                  </div>
                ))}
                {inProgressTasks.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted border border-dashed border-card-border rounded-xl">
                    Devam eden görev bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Column 3: Completed */}
          {showCompleted && (
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col">
              <div className="flex items-center justify-between border-b border-card-border pb-3.5 mb-5">
                <span className="flex items-center space-x-2 text-sm font-bold text-foreground">
                  <CheckCircle className="h-4.5 w-4.5 text-success shrink-0" />
                  <span>Tamamlananlar</span>
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                  {completedTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="glass-card opacity-75 rounded-xl p-5 border border-card-border bg-card-border/5 space-y-4 transition hover:border-card-border/80 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <h5 className="text-sm font-bold text-foreground leading-snug line-through">{formatCompetencyText(task.title, employeeProfile?.department, employeeProfile?.jobRole)}</h5>
                      {renderPriorityBadge(task.priority)}
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">{formatCompetencyText(task.description, employeeProfile?.department, employeeProfile?.jobRole)}</p>

                    {/* Resource Link Card */}
                    {task.resource && (
                      <a
                        href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 px-3 py-2 transition text-left opacity-75"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-primary mb-0.5">
                            {task.deliveryType || 'Gelişim Kaynağı'}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground truncate block pr-2">
                            {task.resource}
                          </span>
                        </div>
                        <span className="flex items-center space-x-1 text-primary font-bold text-[10px] shrink-0 bg-primary/10 rounded-lg px-2 py-1">
                          <span>Aç</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    )}

                    {/* Action row */}
                    <div className="border-t border-card-border pt-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-muted">Bitiş: {task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR') : '-'}</span>
                      <span className="flex items-center text-xs font-semibold text-success space-x-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Tamamlandı</span>
                      </span>
                    </div>
                  </div>
                ))}
                {completedTasks.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted border border-dashed border-card-border rounded-xl">
                    Tamamlanmış görev bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedTask(null)}>
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-card-border bg-card/95 shadow-2xl p-6 relative space-y-6" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 p-2 text-muted hover:text-foreground rounded-full hover:bg-card-border/20 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header / Title */}
            <div className="space-y-2 pr-6">
              <div className="flex flex-wrap items-center gap-1.5">
                {renderPriorityBadge(selectedTask.priority)}
                <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  selectedTask.status === 'Completed'
                    ? 'bg-success/10 border-success/20 text-success'
                    : selectedTask.status === 'InProgress'
                    ? 'bg-warning/10 border-warning/20 text-warning'
                    : 'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  {selectedTask.status === 'Completed'
                    ? 'Tamamlandı'
                    : selectedTask.status === 'InProgress'
                    ? 'Devam Ediyor'
                    : 'Atandı'}
                </span>
                {selectedTask.dueDate && selectedTask.status !== 'Completed' && (
                  isTaskOverdue(selectedTask.dueDate, selectedTask.status) ? (
                    <span className="bg-danger/10 border border-danger/20 text-danger text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3" /> Süresi Geçti
                    </span>
                  ) : isTaskDueSoon(selectedTask.dueDate, selectedTask.status) ? (
                    <span className="bg-warning/15 border border-warning/30 text-warning text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Süre Az Kaldı
                    </span>
                  ) : null
                )}
              </div>
              <h4 className="text-lg font-bold text-foreground leading-snug">{formatCompetencyText(selectedTask.title, employeeProfile?.department, employeeProfile?.jobRole)}</h4>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Açıklama</span>
              <p className="text-sm text-foreground/80 leading-relaxed bg-muted/5 border border-card-border rounded-xl p-4">
                {formatCompetencyText(selectedTask.description, employeeProfile?.department, employeeProfile?.jobRole)}
              </p>
            </div>

            {/* Task Meta details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Görev Atayan</span>
                <span className="text-sm font-semibold text-foreground block">{selectedTask.assignedByUserName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Atama Tarihi</span>
                <span className="text-sm font-semibold text-foreground block">
                  {new Date(selectedTask.assignedAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
              {selectedTask.dueDate && (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Son Teslim Tarihi</span>
                  <span className={`text-sm font-semibold block ${isTaskOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-danger' : 'text-foreground'}`}>
                    {new Date(selectedTask.dueDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
              {selectedTask.completedAt && (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Tamamlanma Tarihi</span>
                  <span className="text-sm font-semibold text-success block">
                    {new Date(selectedTask.completedAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
            </div>

            {/* Resource details */}
            {selectedTask.resource && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Önerilen Gelişim Kaynağı</span>
                <a
                  href={selectedTask.resource.startsWith('http') ? selectedTask.resource : `https://${selectedTask.resource}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 py-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-primary mb-0.5">
                      {selectedTask.deliveryType || 'Online Kurs / Makale'}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate block pr-2">
                      {selectedTask.resource}
                    </span>
                  </div>
                  <span className="flex items-center space-x-1 bg-primary text-white font-bold text-xs shrink-0 rounded-xl px-3 py-2">
                    <span>Eğitime Git</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </a>
              </div>
            )}

            {/* Quick Actions Row */}
            <div className="border-t border-card-border pt-4 flex items-center justify-between gap-4">
              <span className="text-xs text-muted">ID: #{selectedTask.id}</span>
              <div className="flex gap-2">
                {selectedTask.status === 'Pending' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTask.id, 'InProgress');
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-bold text-white transition"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Çalışmaya Başla</span>
                  </button>
                )}
                {selectedTask.status === 'InProgress' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTask.id, 'Completed');
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-success hover:bg-success/80 px-4 py-2 text-xs font-bold text-white transition"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Tamamla</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-card-border hover:bg-card-border/20 text-foreground transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
