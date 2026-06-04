'use client';

import { useEffect, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { apiClient } from '../../../services/apiClient';
import { Assessment, EvaluatorType, EmployeeDetail } from '../../../types';
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
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [evaluatorType, setEvaluatorType] = useState<EvaluatorType>('Peer');
  const [scores, setScores] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchAssessments = async () => {
    setIsLoading(true);
    try {
      // For demo, list all active assessments in the system
      const empRes = await apiClient.employees.list(1, 100);
      if (empRes.success) {
        setEmployees(empRes.data);
        const allAss: Assessment[] = [];
        for (const emp of empRes.data) {
          const assRes = await apiClient.employees.getAssessments(emp.id, 1, 50);
          if (assRes.success) {
            allAss.push(...assRes.data);
          }
        }
        
        let filteredAss = allAss.filter(a => a.status === 'Draft');

        // Filter: Standard users only see assessments where they have a relation with the target employee.
        // HR / Admin without a linked employeeId can see all assessments for demo/admin purposes.
        if (user && user.employeeId !== null) {
          const currentUserEmp = empRes.data.find(e => e.id === user.employeeId);
          filteredAss = filteredAss.filter(ass => {
            if (user.employeeId === ass.employeeId) return true;
            
            const targetEmp = empRes.data.find(e => e.id === ass.employeeId);
            if (!targetEmp) return false;

            if (targetEmp.managerId === user.employeeId) return true;

            if (currentUserEmp && currentUserEmp.managerId === targetEmp.id) return true;

            if (currentUserEmp && currentUserEmp.department === targetEmp.department) return true;

            return false;
          });
        }

        setAssessments(filteredAss);
      }
    } catch (err) {
      console.error('Error fetching surveys', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchAssessments();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Synchronize scores when selected assessment or evaluator type changes
  useEffect(() => {
    if (!selectedAssessment) return;

    let active = true;
    const loadScores = async () => {
      const initialScores: Record<number, number> = {};
      for (let i = 1; i <= 13; i++) {
        initialScores[i] = 3.0;
      }

      try {
        const scoreRes = await apiClient.assessments.getScores(selectedAssessment.id);
        if (active && scoreRes.success && scoreRes.data) {
          const evaluatorScores = scoreRes.data.filter(s => s.evaluatorType === evaluatorType);
          for (const s of evaluatorScores) {
            initialScores[s.competencyId] = s.score;
          }
          setScores(initialScores);
        }
      } catch (err) {
        console.error('Error fetching scores', err);
        if (active) {
          setScores(initialScores);
        }
      }
    };

    loadScores();

    return () => {
      active = false;
    };
  }, [selectedAssessment, evaluatorType]);

  const handleStartEvaluation = (ass: Assessment) => {
    setSelectedAssessment(ass);
    setSubmitSuccess(false);

    // Determine evaluator type based on logged role relative to target
    let determinedType: EvaluatorType = 'Peer';
    if (user && user.employeeId !== null) {
      if (user.employeeId === ass.employeeId) {
        determinedType = 'Self';
      } else {
        const targetEmp = employees.find(e => e.id === ass.employeeId);
        const currentUserEmp = employees.find(e => e.id === user.employeeId);

        if (targetEmp && targetEmp.managerId === user.employeeId) {
          determinedType = 'Manager';
        } else if (currentUserEmp && targetEmp && currentUserEmp.managerId === targetEmp.id) {
          determinedType = 'Subordinate';
        } else if (currentUserEmp && targetEmp && currentUserEmp.department === targetEmp.department) {
          determinedType = 'Peer';
        }
      }
    } else {
      // Default to Manager for HR / Admin without employeeId
      determinedType = 'Manager';
    }
    setEvaluatorType(determinedType);
  };

  const handleScoreChange = (competencyId: number, val: number) => {
    setScores((prev) => ({ ...prev, [competencyId]: val }));
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment) return;

    setIsSubmitting(true);
    try {
      // Post all 13 scores
      for (let compId = 1; compId <= 13; compId++) {
        const score = scores[compId];
        await apiClient.assessments.upsertScore(
          selectedAssessment.id,
          compId,
          evaluatorType,
          score
        );
      }

      // Automatically complete the assessment for this demo flow if HR or Manager evaluates
      if (evaluatorType === 'Manager' || user?.role === 'HR') {
        await apiClient.assessments.complete(selectedAssessment.id);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSelectedAssessment(null);
        fetchAssessments();
      }, 2000);
    } catch (err) {
      console.error('Error submitting scores', err);
      toast.error('Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to resolve competency display labels dynamically
  const getCompetencyLabel = (competencyCode: string, targetEmpId: number) => {
    // fallback or fetch target employee from mock database direct
    const list = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_employees') || '[]') : [];
    interface MockEmp { id: number; department: string; jobRole: string }
    const emp = list.find((e: MockEmp) => e.id === targetEmpId);
    
    if (!emp) return competencyCode;

    if (competencyCode.startsWith('Core_')) {
      return (competencyMapping.core_descriptions as Record<string, string>)[competencyCode] || competencyCode;
    }

    if (competencyCode.startsWith('Dept_')) {
      return (competencyMapping.dept_comp_labels as Record<string, Record<string, string>>)[emp.department]?.[competencyCode] || competencyCode;
    }

    if (competencyCode.startsWith('Role_')) {
      return (competencyMapping.role_comp_labels as Record<string, Record<string, string>>)[emp.jobRole]?.[competencyCode] || competencyCode;
    }

    return competencyCode;
  };

  if (isLoading && assessments.length === 0 && !selectedAssessment) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Get active competency names based on ID mapping inside mockDb
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
      {!selectedAssessment ? (
        // LIST VIEW
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">360° Değerlendirme Anketleri</h3>
            <p className="text-xs text-muted mt-0.5">Katılmanız beklenen performans değerlendirme süreçleri.</p>
          </div>

          {assessments.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-card-border max-w-lg mx-auto space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-success animate-pulse" />
              <h4 className="text-lg font-bold text-foreground">Tüm Anketler Dolduruldu</h4>
              <p className="text-sm text-muted">
                Katılmanız gereken aktif bir değerlendirme anketi bulunmuyor. Teşekkürler!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-3xl">
              {assessments.map((ass) => {
                const targetEmp = employees.find((e) => e.id === ass.employeeId);
                const roleSuffix = targetEmp ? ` (${targetEmp.jobRole})` : '';
                return (
                  <div
                    key={ass.id}
                    className="glass-panel rounded-2xl p-5 border border-card-border flex items-center justify-between transition hover:border-card-border/80"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {ass.employeeName}{roleSuffix} - Yetkinlik Değerlendirmesi
                        </p>
                        <p className="text-xs text-muted mt-0.5">{ass.cycleName} • Durum: Puan Girişi Bekleniyor</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartEvaluation(ass)}
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
              onClick={() => setSelectedAssessment(null)}
              className="flex items-center space-x-1 text-xs font-semibold text-muted hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Geri Dön</span>
            </button>
            <span className="text-xs text-muted">Assessment ID: #{selectedAssessment.id}</span>
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
                    {selectedAssessment.employeeName}
                    {(() => {
                      const targetEmp = employees.find((e) => e.id === selectedAssessment.employeeId);
                      return targetEmp ? ` (${targetEmp.jobRole})` : '';
                    })()}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Lütfen çalışanın yetkinlik seviyelerini 1.0 (Çok Zayıf) ile 5.0 (Mükemmel) arasında değerlendirin.
                  </p>
                </div>

                {/* Evaluator Selector - Only visible for HR or Admin */}
                {(user?.role === 'HR' || user?.role === 'Admin') && (
                  <div className="rounded-2xl bg-card border border-card-border p-4">
                    <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                      Değerlendiren Rolü / İlişki Tipi (Yönetici Görünümü)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Self', 'Manager', 'Peer', 'Subordinate'] as EvaluatorType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEvaluatorType(type)}
                          className={`rounded-lg py-2 text-center text-xs font-semibold border transition ${
                            evaluatorType === type
                              ? 'bg-primary border-primary text-white shadow-md'
                              : 'bg-background border-card-border text-muted hover:text-foreground'
                          }`}
                        >
                          {type === 'Self' ? 'Kendi' : type === 'Manager' ? 'Yönetici' : type === 'Peer' ? 'Meslektaş' : 'Ast'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scorecards */}
                <div className="space-y-5">
                  {competenciesMetadata.map((comp) => {
                    const label = getCompetencyLabel(comp.code, selectedAssessment.employeeId);
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
                            <span>{scores[comp.id]?.toFixed(1)}</span>
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
