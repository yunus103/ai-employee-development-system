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
  ExternalLink
} from 'lucide-react';

export default function EmployeePlanPage() {
  const { user } = useStore();
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.tasks.getMy(1, 100);
      if (res.success) {
        setTasks(res.data);
      } else {
        setError('Görevler yüklenemedi.');
      }
    } catch (err) {
      console.error('Error fetching tasks', err);
      setError('Görevler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchTasks();
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
        // Reload tasks list
        fetchTasks();
      } else {
        toast.error(res.message || 'Durum güncellenirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Error updating task status', err);
      toast.error('İşlem başarısız oldu.');
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

  // Group tasks into buckets
  const todoTasks = sortedTasks.filter((t) => t.status === 'Assigned');
  const inProgressTasks = sortedTasks.filter((t) => t.status === 'InProgress');
  const completedTasks = sortedTasks.filter((t) => t.status === 'Completed');

  // Stats
  const totalCount = tasks.length;
  const completedCount = completedTasks.length;
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">Kişisel Gelişim Planım</h3>
          <p className="text-xs text-muted mt-0.5">AI önerileri ile hazırlanan gelişim görevlerinin takibi.</p>
        </div>

        {/* Progress Bar Widget */}
        <div className="flex items-center space-x-4 bg-card border border-card-border rounded-2xl px-5 py-3 w-full sm:w-auto">
          <div className="text-right">
            <span className="text-xs text-muted font-medium block">Tamamlanma Oranı</span>
            <span className="text-lg font-bold text-foreground">%{progressPercent}</span>
          </div>
          {/* Progress Indicator Circle */}
          <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-card-border"
                strokeWidth="3"
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
            <span className="absolute text-[10px] font-bold text-foreground">{completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-3 rounded-xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Column 1: Assigned / Todo */}
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
                <div key={task.id} className="glass-card rounded-xl p-5 border border-card-border space-y-4 transition hover:border-card-border/80">
                  <div className="flex justify-between items-start">
                    <h5 className="text-sm font-bold text-foreground leading-snug">{task.title}</h5>
                    {renderPriorityBadge(task.priority)}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{task.description}</p>
                  
                  {/* Resource Link */}
                  {task.resource && (
                    <div className="flex items-center space-x-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        {task.deliveryType && (
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">{task.deliveryType}</span>
                        )}
                        <a
                          href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary hover:underline truncate block"
                        >
                          {task.resource}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Action row */}
                  <div className="border-t border-card-border pt-4 flex items-center justify-between">
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

          {/* Column 2: InProgress */}
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
                <div key={task.id} className="glass-card rounded-xl p-5 border border-card-border space-y-4 transition hover:border-card-border/80">
                  <div className="flex justify-between items-start">
                    <h5 className="text-sm font-bold text-foreground leading-snug">{task.title}</h5>
                    {renderPriorityBadge(task.priority)}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{task.description}</p>
                  
                  {/* Resource Link */}
                  {task.resource && (
                    <div className="flex items-center space-x-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        {task.deliveryType && (
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">{task.deliveryType}</span>
                        )}
                        <a
                          href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary hover:underline truncate block"
                        >
                          {task.resource}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Action row */}
                  <div className="border-t border-card-border pt-4 flex items-center justify-between">
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

          {/* Column 3: Completed */}
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
                <div key={task.id} className="glass-card opacity-70 rounded-xl p-5 border border-card-border bg-card-border/10 space-y-4">
                  <div className="flex justify-between items-start">
                    <h5 className="text-sm font-bold text-foreground leading-snug line-through">{task.title}</h5>
                    {renderPriorityBadge(task.priority)}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{task.description}</p>
                  
                  {/* Resource Link */}
                  {task.resource && (
                    <div className="flex items-center space-x-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 opacity-60">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline truncate block"
                      >
                        {task.resource}
                      </a>
                    </div>
                  )}
                  
                  {/* Action row */}
                  <div className="border-t border-card-border pt-4 flex items-center justify-between">
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
        </div>
      )}
    </div>
  );
}
