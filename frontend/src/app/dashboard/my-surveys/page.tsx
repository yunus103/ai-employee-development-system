'use client';

import { useEffect, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { apiClient } from '../../../services/apiClient';
import { MySurvey, EvaluatorType, EmployeeDetail } from '../../../types';
import competencyMapping from '../../../data/competency_mapping.json';
import { toast } from '../../../store/useToastStore';
import {
  ClipboardList,
  Star,
  CheckCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

export default function MySurveysPage() {
  const { user } = useStore();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [surveys, setSurveys] = useState<MySurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<MySurvey | null>(null);
  const [targetEmployee, setTargetEmployee] = useState<EmployeeDetail | null>(null);
  const [evaluatorType, setEvaluatorType] = useState<EvaluatorType>('Peer');
  const [scores, setScores] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Fetch employees to map job roles in the list view (only for HR/Manager/Admin)
      if (user && user.role !== 'Employee') {
        try {
          const empRes = await apiClient.employees.list(1, 100);
          if (empRes.success) {
            setEmployees(empRes.data);
          }
        } catch (empErr) {
          console.warn('Could not load employee details (unauthorized or network error):', empErr);
        }
      }

      // Fetch pending surveys for this user (only if they have an associated employee profile)
      if (user && user.employeeId !== null) {
        const surveyRes = await apiClient.tasks.getMySurveys();
        if (surveyRes.success) {
          setSurveys(surveyRes.data);
        }
      } else {
        setSurveys([]);
      }
    } catch (err: any) {
      console.error('Error fetching surveys:', err.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchInitialData();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Synchronize scores when selected survey changes
  useEffect(() => {
    if (!user || !selectedSurvey) return;

    let active = true;
    const loadScores = async () => {
      const initialScores: Record<number, number> = {};
      for (let i = 1; i <= 13; i++) {
        initialScores[i] = 3.0;
      }

      try {
        const scoreRes = await apiClient.assessments.getScores(selectedSurvey.assessmentId);
        if (active && scoreRes.success && scoreRes.data) {
          // Backend'den gelen evaluatorEmployeeId ile filtrele (kim dolduruyorsa onun skorları)
          // Fallback: survey'de alan yoksa user.employeeId (Manager/Employee için her zaman eşleşir)
          const myEvaluatorId = selectedSurvey.evaluatorEmployeeId ?? user?.employeeId;
          const evaluatorScores = scoreRes.data.filter(
            s => s.evaluatorEmployeeId === myEvaluatorId
          );
          for (const s of evaluatorScores) {
            initialScores[s.competencyId] = s.score;
          }
          setScores(initialScores);
        }
      } catch (err: any) {
        console.error('Error fetching scores:', err.message || err);
        if (active) {
          setScores(initialScores);
        }
      }
    };

    loadScores();

    return () => {
      active = false;
    };
  }, [selectedSurvey, user]);

  const handleStartEvaluation = async (survey: MySurvey) => {
    setSelectedSurvey(survey);
    setSubmitSuccess(false);
    setEvaluatorType(survey.evaluatorType);

    // Look up target employee details
    const existing = employees.find(e => e.id === survey.employeeId);
    if (existing) {
      setTargetEmployee(existing);
    } else {
      try {
        const empRes = await apiClient.employees.get(survey.employeeId);
        if (empRes.success) {
          setTargetEmployee(empRes.data);
        }
      } catch (e: any) {
        console.warn('Could not fetch target employee detailed profile:', e.message || e);
      }
    }
  };

  const handleScoreChange = (competencyId: number, val: number) => {
    setScores((prev) => ({ ...prev, [competencyId]: val }));
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    setIsSubmitting(true);
    try {
      // Map score dictionary to backend format
      const payload = Object.keys(scores).map(key => {
        const competencyId = Number(key);
        return {
          competencyId,
          score: scores[competencyId]
        };
      });

      // Backend'den gelen evaluatorEmployeeId'yi kullan — bu assignment'taki gerçek değerlendirici ID'si.
      // Fallback: backend bu alanı henüz dönmüyorsa user.employeeId (Manager/Employee için eşdeğer).
      const evaluatorEmployeeId = selectedSurvey.evaluatorEmployeeId ?? user?.employeeId;
      if (!evaluatorEmployeeId) {
        toast.error('Değerlendirici kimliği belirlenemiyor. Lütfen tekrar giriş yapın.');
        setIsSubmitting(false);
        return;
      }

      const res = await apiClient.assessments.submitBulkScores(
        selectedSurvey.assessmentId,
        evaluatorEmployeeId,
        payload,
        selectedSurvey.evaluatorType
      );

      if (res.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSelectedSurvey(null);
          setTargetEmployee(null);
          fetchInitialData();
        }, 2000);
      } else {
        toast.error(res.message || 'Değerlendirme kaydedilirken bir hata oluştu.');
      }
    } catch (err: any) {
      console.error('Error submitting scores:', err.message || err);
      toast.error(err.response?.data?.message || err.message || 'Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCompetencyLabel = (competencyCode: string): string => {
    if (!competencyCode) return '';

    // Core competencies → short Turkish label
    if (competencyCode.startsWith('Core_')) {
      const coreLabels = (competencyMapping as unknown as Record<string, Record<string, string>>)['core_labels'];
      return coreLabels?.[competencyCode] || competencyCode;
    }

    if (!targetEmployee) return competencyCode;

    // Department competencies → display label by department
    if (competencyCode.startsWith('Dept_')) {
      const deptDisplayLabels = (competencyMapping as unknown as Record<string, Record<string, Record<string, string>>>)['dept_comp_display_labels'];
      return deptDisplayLabels?.[targetEmployee.department]?.[competencyCode] || competencyCode;
    }

    // Try finding by C# code key for department competencies
    const deptLabels = (competencyMapping as any).dept_comp_labels[targetEmployee.department];
    if (deptLabels) {
      const matchingKey = Object.keys(deptLabels).find(key => deptLabels[key] === competencyCode);
      if (matchingKey) {
        const deptDisplayLabels = (competencyMapping as any).dept_comp_display_labels[targetEmployee.department];
        return deptDisplayLabels?.[matchingKey] || competencyCode;
      }
    }

    // Role competencies → display label by job role
    if (competencyCode.startsWith('Role_')) {
      const roleDisplayLabels = (competencyMapping as unknown as Record<string, Record<string, Record<string, string>>>)['role_comp_display_labels'];
      return roleDisplayLabels?.[targetEmployee.jobRole]?.[competencyCode] || competencyCode;
    }

    // Try finding by C# code key for role competencies
    const roleLabels = (competencyMapping as any).role_comp_labels[targetEmployee.jobRole];
    if (roleLabels) {
      const matchingKey = Object.keys(roleLabels).find(key => roleLabels[key] === competencyCode);
      if (matchingKey) {
        const roleDisplayLabels = (competencyMapping as any).role_comp_display_labels[targetEmployee.jobRole];
        return roleDisplayLabels?.[matchingKey] || competencyCode;
      }
    }

    return competencyCode;
  };

  if (isLoading && surveys.length === 0 && !selectedSurvey) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const competenciesMetadata = [
    { id: 1, code: 'Core_Communication', category: 'Core' },
    { id: 2, code: 'Core_Teamwork', category: 'Core' },
    { id: 3, code: 'Core_ProblemSolving', category: 'Core' },
    { id: 4, code: 'Core_Adaptability', category: 'Core' },
    { id: 5, code: 'Core_TimeManagement', category: 'Core' },
    { id: 6, code: 'Core_Initiative', category: 'Core' },
    { id: 7, code: 'Core_Accountability', category: 'Core' },
    { id: 8, code: 'Core_LearningAgility', category: 'Core' },
    { id: 9, code: 'Dept_Comp1', category: 'Department' },
    { id: 10, code: 'Dept_Comp2', category: 'Department' },
    { id: 11, code: 'Dept_Comp3', category: 'Department' },
    { id: 12, code: 'Role_Comp1', category: 'Role' },
    { id: 13, code: 'Role_Comp2', category: 'Role' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {!selectedSurvey ? (
        // LIST VIEW
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">360° Değerlendirme Anketleri</h3>
            <p className="text-xs text-muted mt-0.5">Katılmanız beklenen performans değerlendirme süreçleri.</p>
          </div>

          {user?.employeeId === null ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-card-border max-w-lg mx-auto space-y-4 animate-fadeIn">
              <CheckCircle className="h-16 w-16 mx-auto text-info/60" />
              <h4 className="text-lg font-bold text-foreground">Değerlendirme Anketi Bulunmuyor</h4>
              <p className="text-sm text-muted">
                Sistem Yöneticisi veya İK yetkilisi hesaplarının doğrudan doldurması gereken bir 360° değerlendirme anketi bulunmamaktadır.
              </p>
            </div>
          ) : surveys.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-card-border max-w-lg mx-auto space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-success animate-pulse" />
              <h4 className="text-lg font-bold text-foreground">Tüm Anketler Dolduruldu</h4>
              <p className="text-sm text-muted">
                Katılmanız gereken aktif bir değerlendirme anketi bulunmuyor. Teşekkürler!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-3xl">
              {surveys.map((survey) => {
                const targetEmp = employees.find((e) => e.id === survey.employeeId);
                const roleSuffix = targetEmp ? ` (${targetEmp.jobRole})` : '';
                return (
                  <div
                    key={survey.assignmentId}
                    className="glass-panel rounded-2xl p-5 border border-card-border flex items-center justify-between transition hover:border-card-border/80"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {survey.employeeName}{roleSuffix} - Yetkinlik Değerlendirmesi
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {survey.cycleName} • İlişki Tipi: {survey.evaluatorType === 'Self' ? 'Kendi' : survey.evaluatorType === 'Manager' ? 'Yönetici' : survey.evaluatorType === 'Peer' ? 'Meslektaş' : 'Ast'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartEvaluation(survey)}
                      className="flex items-center space-x-1 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2.5 text-xs font-semibold text-white shadow-md transition duration-150"
                    >
                      <span>Değerlendir</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // EVALUATION FORM VIEW
        <div className="space-y-6 max-w-3xl">
          {/* Back button and profile header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedSurvey(null);
                setTargetEmployee(null);
              }}
              className="flex items-center space-x-1 text-xs font-semibold text-muted hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Geri Dön</span>
            </button>
            <span className="text-xs text-muted">Assessment ID: #{selectedSurvey.assessmentId}</span>
          </div>

          <div className="glass-panel rounded-3xl p-6 md:p-8 border border-card-border space-y-6">
            {submitSuccess ? (
              <div className="py-12 text-center space-y-4 animate-scaleUp">
                <CheckCircle className="h-16 w-16 mx-auto text-success" />
                <h4 className="text-lg font-bold text-foreground">Değerlendirme Kaydedildi</h4>
                <p className="text-sm text-muted">
                  360° değerlendirme puanları sisteme başarıyla işlendi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvaluation} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {selectedSurvey.employeeName}
                    {targetEmployee ? ` (${targetEmployee.jobRole})` : ''}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Değerlendiren İlişkisi: <span className="font-semibold text-primary">{evaluatorType === 'Self' ? 'Kendi' : evaluatorType === 'Manager' ? 'Yönetici' : evaluatorType === 'Peer' ? 'Meslektaş' : 'Ast'}</span>
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Lütfen çalışanın yetkinlik seviyelerini 1.0 (Çok Zayıf) ile 5.0 (Mükemmel) arasında değerlendirin.
                  </p>
                </div>

                {/* Scorecards */}
                <div className="space-y-5">
                  {competenciesMetadata.map((comp) => {
                    const label = getCompetencyLabel(comp.code);
                    return (
                      <div key={comp.id} className="rounded-2xl border border-card-border bg-card/30 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="rounded bg-card-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted mr-2">
                              {comp.category}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{label}</span>
                          </div>
                          <span className="flex items-center space-x-1 font-bold text-sm text-primary">
                            <Star className="h-4 w-4 shrink-0 fill-current text-primary" />
                            <span>{scores[comp.id]?.toFixed(1) || '3.0'}</span>
                          </span>
                        </div>

                        {/* Slider controls */}
                        <div className="flex items-center space-x-4">
                          <span className="text-xs text-muted shrink-0">1.0</span>
                          <input
                            type="range"
                            min="1.0"
                            max="5.0"
                            step="0.1"
                            value={scores[comp.id] || 3.0}
                            onChange={(e) => handleScoreChange(comp.id, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-card-border rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-xs text-muted shrink-0">5.0</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-xl bg-primary hover:bg-primary-hover py-3.5 px-4 font-semibold text-white shadow-lg shadow-primary/20 transition duration-150 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Değerlendirmeyi Gönder</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
