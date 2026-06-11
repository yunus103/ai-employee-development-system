'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../services/apiClient';
import { toast } from '../../../../store/useToastStore';
import { useConfirmStore } from '../../../../store/useConfirmStore';
import { useStore } from '../../../../store/useStore';
import {
  EmployeeDetail,
  Assessment,
  AssessmentScore,
  ActionPlan,
  ActionPriority,
  EvaluatorType,
  AssessmentAssignment
} from '../../../../types';
import competencyMapping from '../../../../data/competency_mapping.json';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Trash2,
  Plus,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const employeeId = parseInt(id);

  // States
  const { user } = useStore();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  
  // Assignment states
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeDetail[]>([]);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<number>(0);
  const [selectedEvaluatorType, setSelectedEvaluatorType] = useState<EvaluatorType>('Peer');
  const [isAssigning, setIsAssigning] = useState(false);

  // Scoring mode state
  const [scorecardInput, setScorecardInput] = useState<Record<number, number>>({});
  const [scorecardEvaluator, setScorecardEvaluator] = useState<EvaluatorType>('Manager');

  // Loading & UX states
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assessment' | 'plan'>('assessment');
  
  // Modal / Add Manual Item states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    priority: 'Medium' as ActionPriority,
    dueDate: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Employee Details
      let targetEmp = null;
      try {
        const empRes = await apiClient.employees.get(employeeId);
        if (empRes.success) {
          setEmployee(empRes.data);
          targetEmp = empRes.data;
        }
      } catch (empErr) {
        // Silent catch to prevent terminal noise; fallback handled gracefully in UI
      }

      // Fetch all employees for assignment option dropdown
      if (user && (user.role === 'HR' || user.role === 'Admin')) {
        try {
          const allEmpRes = await apiClient.employees.list(1, 100);
          if (allEmpRes.success) {
            setAllEmployees(allEmpRes.data.filter(e => e.id !== employeeId));
          }
        } catch (listErr) {
          // Silent catch to prevent terminal noise; fallback handled gracefully in UI
        }
      }

      // 1b. Fetch Logged-in User Employee Details if not HR/Admin
      let userEmp = null;
      if (user && user.employeeId !== null) {
        try {
          const userEmpRes = await apiClient.employees.get(user.employeeId);
          if (userEmpRes.success) {
            userEmp = userEmpRes.data;
          }
        } catch (userEmpErr) {
          // Silent catch to prevent terminal noise; fallback handled gracefully in UI
        }
      }

      // Determine and set relationship evaluator type
      let determinedType: EvaluatorType = 'Peer';
      if (user) {
        if (user.role === 'HR' || user.role === 'Admin') {
          determinedType = 'Manager';
        } else if (user.employeeId !== null && targetEmp) {
          if (user.employeeId === targetEmp.id) {
            determinedType = 'Self';
          } else if (targetEmp.managerId === user.employeeId) {
            determinedType = 'Manager';
          } else if (userEmp && userEmp.managerId === targetEmp.id) {
            determinedType = 'Subordinate';
          } else if (userEmp && userEmp.department === targetEmp.department) {
            determinedType = 'Peer';
          }
        }
      }
      setScorecardEvaluator(determinedType);

      // 2. Fetch Employee Assessments
      try {
        const assRes = await apiClient.employees.getAssessments(employeeId, 1, 100);
        if (assRes.success) {
          const active = assRes.data[0]; // latest assessment
          if (active) {
            setActiveAssessment(active);
            
            // Fetch assignments list
            try {
              const assignRes = await apiClient.assessments.listAssignments(active.id);
              if (assignRes.success) {
                setAssignments(assignRes.data);
              }
            } catch (assignErr) {
              // Silent catch to prevent terminal noise; fallback handled gracefully in UI
            }
            
            // 3. Fetch Assessment Scores
            let loadedScores: AssessmentScore[] = [];
            try {
              const scoreRes = await apiClient.assessments.getScores(active.id);
              if (scoreRes.success) {
                setScores(scoreRes.data);
                loadedScores = scoreRes.data;
              }
            } catch (scoreErr) {
              // Silent catch to prevent terminal noise; fallback handled gracefully in UI
            }

            // Initialize scorecardInput with 13 defaults or existing draft scores
            if (active.status === 'Draft') {
              const initial: Record<number, number> = {};
              for (let i = 1; i <= 13; i++) {
                initial[i] = 3.0;
              }
              const evaluatorScores = loadedScores.filter(s => s.evaluatorType === determinedType);
              for (const s of evaluatorScores) {
                initial[s.competencyId] = s.score;
              }
              setScorecardInput(initial);
            }

            // 4. Fetch Action Plan if exists
            try {
              const planRes = await apiClient.employees.getActionPlans(employeeId);
              if (planRes.success && planRes.data.length > 0) {
                // Find plan matching this assessment
                const matchedPlan = planRes.data.find(p => p.assessmentId === active.id);
                if (matchedPlan) {
                  const fullPlanRes = await apiClient.actionPlans.get(matchedPlan.id);
                  if (fullPlanRes.success) {
                    setActionPlan(fullPlanRes.data);
                    setActiveTab('plan'); // route to plan tab if plan exists
                  }
                }
              }
            } catch (planErr) {
              // Silent catch to prevent terminal noise; fallback handled gracefully in UI
            }
          }
        }
      } catch (assErr) {
        // Silent catch to prevent terminal noise; fallback handled gracefully in UI
      }
    } catch (err) {
      // Silent catch to prevent terminal noise; fallback handled gracefully in UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssessment || !selectedEvaluatorId) return;
    setIsAssigning(true);
    try {
      const res = await apiClient.assessments.addAssignment(
        activeAssessment.id,
        selectedEvaluatorId,
        selectedEvaluatorType
      );
      if (res.success) {
        toast.success('Değerlendirici başarıyla atandı.');
        setSelectedEvaluatorId(0);
        // Refresh assignments list
        const assignRes = await apiClient.assessments.listAssignments(activeAssessment.id);
        if (assignRes.success) {
          setAssignments(assignRes.data);
        }
      } else {
        toast.error(res.message || 'Değerlendirici atanamadı.');
      }
    } catch (err) {
      console.error(err);
      toast.error('İşlem sırasında bir hata oluştu.');
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchData();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, user]);

  // Handle Assessment Score Inputs
  const handleScoreChange = (competencyId: number, score: number) => {
    setScorecardInput(prev => ({ ...prev, [competencyId]: score }));
  };

  const getEvaluatorEmployeeId = (): number | null => {
    if (user?.role !== 'HR' && user?.role !== 'Admin') {
      return user?.employeeId || null;
    }
    if (scorecardEvaluator === 'Self') {
      return employeeId;
    }
    if (scorecardEvaluator === 'Manager' && employee?.managerId) {
      return employee.managerId;
    }
    const matchingAssignment = assignments.find(
      a => a.evaluatorType === scorecardEvaluator
    );
    if (matchingAssignment) {
      return matchingAssignment.evaluatorEmployeeId;
    }
    return user?.employeeId || null;
  };

  const handleSaveScores = async () => {
    if (!activeAssessment) return;
    setIsActionLoading(true);
    try {
      const evaluatorEmpId = getEvaluatorEmployeeId();
      for (const compId of Object.keys(scorecardInput).map(Number)) {
        const val = scorecardInput[compId];
        await apiClient.assessments.upsertScore(
          activeAssessment.id,
          compId,
          scorecardEvaluator,
          val,
          evaluatorEmpId
        );
      }
      toast.success('Puanlar başarıyla kaydedildi.');
      fetchData();
    } catch (err) {
      console.error('Error upserting scores', err);
      toast.error('Puanlar kaydedilirken hata oluştu.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteAssessment = async () => {
    if (!activeAssessment) return;
    useConfirmStore.getState().showConfirm({
      title: 'Değerlendirmeyi Tamamla',
      message: 'Değerlendirmeyi tamamlamak istediğinize emin misiniz? Değerlendirme bittiğinde AI gelişim planı aşamasına geçebilirsiniz.',
      confirmLabel: 'Tamamla',
      cancelLabel: 'İptal',
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          // 1. Auto-save current scorecard input scores first
          const evaluatorEmpId = getEvaluatorEmployeeId();
          for (const compId of Object.keys(scorecardInput).map(Number)) {
            const val = scorecardInput[compId];
            await apiClient.assessments.upsertScore(
              activeAssessment.id,
              compId,
              scorecardEvaluator,
              val,
              evaluatorEmpId
            );
          }

          // 2. Complete the assessment
          const res = await apiClient.assessments.complete(activeAssessment.id);
          if (res.success) {
            toast.success('Değerlendirme başarıyla tamamlandı. Artık AI planı üretebilirsiniz.');
            fetchData();
          } else {
            toast.error(res.message || 'Hata oluştu.');
          }
        } catch (err) {
          console.error('Error completing assessment', err);
          const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Değerlendirme tamamlanırken bir hata oluştu.';
          toast.error(errMsg);
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  // AI Plan Generation Trigger
  const handleGenerateAIPlan = async () => {
    if (!activeAssessment) return;
    setIsActionLoading(true);
    try {
      const res = await apiClient.actionPlans.generate(activeAssessment.id, 13);
      if (res.success && res.data) {
        toast.success('Yapay zeka gelişim planı başarıyla üretildi!');
        fetchData();
        setActiveTab('plan');
      } else {
        toast.error(res.message || 'Gelişim planı oluşturulamadı.');
      }
    } catch (err) {
      console.error('Error generating AI plan', err);
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'AI planlama servisiyle bağlantı kurulamadı.';
      toast.error(errMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Action Plan Items Editing (Phase 6)
  const handleUpdateItem = async (
    itemId: number,
    field: 'title' | 'description' | 'priority' | 'dueDate',
    val: string | null
  ) => {
    if (!actionPlan) return;
    const item = actionPlan.items.find((i) => i.id === itemId);
    if (!item) return;

    const updatedData = {
      title: field === 'title' ? (val ?? '') : item.title,
      description: field === 'description' ? (val ?? '') : item.description,
      priority: (field === 'priority' ? (val ?? 'Medium') : item.priority) as ActionPriority,
      dueDate: field === 'dueDate' ? val : item.dueDate,
      orderNo: item.orderNo
    };

    try {
      const res = await apiClient.actionPlans.updateItem(actionPlan.id, itemId, updatedData);
      if (res.success) {
        // Refresh local plan state
        const updatedItems = actionPlan.items.map(i => i.id === itemId ? res.data : i);
        setActionPlan({ ...actionPlan, items: updatedItems });
      }
    } catch (e) {
      console.error(e);
      const errMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Görev güncellenirken hata oluştu.';
      toast.error(errMsg);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!actionPlan) return;
    useConfirmStore.getState().showConfirm({
      title: 'Görevi Kaldır',
      message: 'Bu gelişim görevini plandan kaldırmak istediğinize emin misiniz?',
      confirmLabel: 'Kaldır',
      cancelLabel: 'İptal',
      onConfirm: async () => {
        try {
          const res = await apiClient.actionPlans.deleteItem(actionPlan.id, itemId);
          if (res.success) {
            setActionPlan({ ...actionPlan, items: actionPlan.items.filter(i => i.id !== itemId) });
          } else {
            toast.error(res.message || 'Görev silinemedi.');
          }
        } catch (e) {
          console.error(e);
          const errMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Görev silinirken hata oluştu.';
          toast.error(errMsg);
        }
      }
    });
  };

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionPlan) return;
    try {
      const res = await apiClient.actionPlans.addItem(actionPlan.id, {
        title: newItem.title,
        description: newItem.description,
        priority: newItem.priority,
        dueDate: newItem.dueDate ? new Date(newItem.dueDate).toISOString() : null
      });

      if (res.success) {
        setActionPlan({ ...actionPlan, items: [...actionPlan.items, res.data] });
        setIsAddModalOpen(false);
        setNewItem({ title: '', description: '', priority: 'Medium', dueDate: '' });
      } else {
        toast.error(res.message || 'Görev eklenemedi.');
      }
    } catch (e) {
      console.error(e);
      const errMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Yeni görev eklenirken hata oluştu.';
      toast.error(errMsg);
    }
  };

  // Plan Lifecycle Triggers
  const handleApprovePlan = async () => {
    if (!actionPlan) return;
    setIsActionLoading(true);
    try {
      const res = await apiClient.actionPlans.approve(actionPlan.id);
      if (res.success) {
        toast.success('Gelişim planı onaylandı.');
        setActionPlan(res.data);
      } else {
        toast.error(res.message || 'Gelişim planı onaylanamadı.');
      }
    } catch (e) {
      console.error(e);
      const errMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gelişim planı onaylanırken hata oluştu.';
      toast.error(errMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendPlan = async () => {
    if (!actionPlan) return;
    setIsActionLoading(true);
    try {
      const res = await apiClient.actionPlans.send(actionPlan.id);
      if (res.success) {
        toast.success('Gelişim planı çalışana gönderildi ve panosuna görev olarak eklendi!');
        setActionPlan(res.data);
      } else {
        toast.error(res.message || 'Gelişim planı gönderilemedi.');
      }
    } catch (e) {
      console.error(e);
      const errMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gelişim planı gönderilirken hata oluştu.';
      toast.error(errMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!actionPlan) return;
    useConfirmStore.getState().showConfirm({
      title: 'Planı İptal Et',
      message: 'Bu gelişim planını iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmLabel: 'İptal Et',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          const res = await apiClient.actionPlans.cancel(actionPlan.id);
          if (res.success) {
            toast.success('Gelişim planı iptal edildi.');
            setActionPlan(res.data);
          } else {
            toast.error(res.message || 'Plan iptal edilemedi.');
          }
        } catch (e) {
          console.warn('Error canceling plan:', e);
          toast.error('Plan iptal edilirken bir hata oluştu.');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  const handleDownloadPDF = async () => {
    if (!actionPlan) return;
    try {
      if (apiClient.isMock) {
        // Generate a beautiful, print-ready HTML page for Mock Mode
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.warning('Pop-up engelleyiciyi devre dışı bırakıp tekrar deneyin.');
          return;
        }

        const priorityWeights: Record<ActionPriority, number> = { High: 3, Medium: 2, Low: 1 };
        const sortedItems = [...actionPlan.items].sort((a, b) => {
          const isCompletedA = a.taskStatus === 'Completed';
          const isCompletedB = b.taskStatus === 'Completed';
          if (isCompletedA && !isCompletedB) return 1;
          if (!isCompletedA && isCompletedB) return -1;

          const weightA = priorityWeights[a.priority] || 0;
          const weightB = priorityWeights[b.priority] || 0;
          return weightB - weightA;
        });

        const itemsHtml = sortedItems
          .map(
            (item) => `
          <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 14px 12px; font-weight: bold; font-size: 13px; color: #18181b;">${item.title}</td>
            <td style="padding: 14px 12px; font-size: 12px; color: #52525b; line-height: 1.5; max-width: 320px;">${item.description}</td>
            <td style="padding: 14px 12px; font-size: 12px; font-weight: bold; color: ${
              item.priority === 'High' ? '#ef4444' : item.priority === 'Medium' ? '#f59e0b' : '#71717a'
            };">${item.priority === 'High' ? 'Yüksek' : item.priority === 'Medium' ? 'Orta' : 'Düşük'}</td>
            <td style="padding: 14px 12px; font-size: 12px; color: #18181b;">${
              item.dueDate ? new Date(item.dueDate).toLocaleDateString('tr-TR') : 'Belirtilmedi'
            }</td>
            <td style="padding: 14px 12px; font-size: 11px; font-weight: 600; color: #8b5cf6;">${
              item.source === 'AI' ? 'AI Önerisi' : 'Manuel'
            }</td>
          </tr>
        `
          )
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Gelişim Planı Raporu - ${employee?.fullName}</title>
              <style>
                body {
                  font-family: 'Segoe UI', system-ui, sans-serif;
                  color: #18181b;
                  padding: 40px;
                  margin: 0;
                  background-color: #ffffff;
                }
                .header-container {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  border-bottom: 2px solid #8b5cf6;
                  padding-bottom: 20px;
                  margin-bottom: 35px;
                }
                .title {
                  font-size: 24px;
                  font-weight: 800;
                  color: #8b5cf6;
                  letter-spacing: -0.5px;
                }
                .subtitle {
                  font-size: 12px;
                  color: #71717a;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-weight: 700;
                  margin-bottom: 5px;
                }
                .meta-table {
                  width: 100%;
                  margin-bottom: 30px;
                  font-size: 13px;
                  border-collapse: collapse;
                }
                .meta-table td {
                  padding: 8px 0;
                  color: #52525b;
                }
                .meta-table td strong {
                  color: #18181b;
                }
                .section-title {
                  font-size: 16px;
                  font-weight: 700;
                  margin: 35px 0 15px 0;
                  color: #18181b;
                  border-left: 4px solid #8b5cf6;
                  padding-left: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                table.tasks-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 10px;
                }
                table.tasks-table th {
                  background-color: #f4f4f5;
                  text-align: left;
                  padding: 12px;
                  font-size: 11px;
                  font-weight: 700;
                  text-transform: uppercase;
                  color: #71717a;
                  border-bottom: 2px solid #e4e4e7;
                }
                .footer {
                  margin-top: 60px;
                  border-top: 1px solid #e4e4e7;
                  padding-top: 20px;
                  font-size: 11px;
                  color: #a1a1aa;
                  text-align: center;
                  line-height: 1.5;
                }
                @media print {
                  body { padding: 0; }
                  @page { margin: 1.5cm; }
                }
              </style>
            </head>
            <body>
              <div class="header-container">
                <div>
                  <div class="subtitle">Kişisel Gelişim ve Analiz Raporu</div>
                  <div class="title">360° AI Destekli Gelişim Planı</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #71717a;">
                  Rapor No: AP-${actionPlan.id}<br>
                  Tarih: ${new Date().toLocaleDateString('tr-TR')}
                </div>
              </div>

              <div class="section-title">Çalışan Bilgileri</div>
              <table class="meta-table">
                <tr>
                  <td style="width: 50%;"><strong>Ad Soyad:</strong> ${employee?.fullName}</td>
                  <td style="width: 50%;"><strong>Çalışan Kodu:</strong> ${employee?.employeeCode}</td>
                </tr>
                <tr>
                  <td><strong>Departman:</strong> ${employee?.department}</td>
                  <td><strong>Görev Tanımı:</strong> ${employee?.jobRole}</td>
                </tr>
                <tr>
                  <td><strong>Yönetici:</strong> ${employee?.managerName || 'Belirtilmedi'}</td>
                  <td><strong>Plan Durumu:</strong> ${
                    actionPlan.status === 'Sent'
                      ? 'Çalışana Gönderildi (Aktif)'
                      : actionPlan.status === 'Approved'
                      ? 'Onaylandı'
                      : 'Taslak Düzenleme'
                  }</td>
                </tr>
              </table>

              <div class="section-title">Gelişim Aksiyon Listesi</div>
              <table class="tasks-table">
                <thead>
                  <tr>
                    <th style="width: 25%;">Görev Adı</th>
                    <th style="width: 40%;">Açıklama</th>
                    <th style="width: 12%;">Öncelik</th>
                    <th style="width: 13%;">Bitiş Tarihi</th>
                    <th style="width: 10%;">Kaynak</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div class="footer">
                Bu rapor çalışanın yöneticileri, ekip arkadaşları ve öz değerlendirmesinden toplanan 360° yetkinlik analiz sonuçlarına dayalı olarak sistem tarafından otomatik olarak üretilmiştir.<br>
                <strong>360° AI-Supported Employee Development Recommendation System &copy; 2026</strong>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 250);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }

      // Real Mode PDF download
      const blob = await apiClient.actionPlans.exportPdf(actionPlan.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${employee?.fullName.toLowerCase().replace(' ', '-')}-gelisim-plani.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('PDF indirilirken hata oluştu.');
    }
  };

  if (isLoading || !employee) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Get dynamic descriptions depending on mapped titles
  const getCompetencyName = (competencyCode: string) => {
    if (!competencyCode) return '';

    // 1. Core Competency mapping → short Turkish label
    if (competencyCode.startsWith('Core_')) {
      return (competencyMapping.core_labels as Record<string, string>)[competencyCode] || competencyCode;
    }

    // 2. Department Competency mapping
    if (employee?.department) {
      const deptDisplay = (competencyMapping.dept_comp_display_labels as Record<string, Record<string, string>>)[employee.department];
      if (deptDisplay) {
        if (competencyCode.startsWith('Dept_')) {
          return deptDisplay[competencyCode] || competencyCode;
        }
        
        // Fallback search for C# code like "Tech_CodingQuality"
        const deptLabels = (competencyMapping.dept_comp_labels as Record<string, Record<string, string>>)[employee.department];
        if (deptLabels) {
          const matchingKey = Object.keys(deptLabels).find(key => deptLabels[key] === competencyCode);
          if (matchingKey) {
            return deptDisplay[matchingKey] || competencyCode;
          }
        }
      }
    }

    // 3. Role Competency mapping
    if (employee?.jobRole) {
      const roleDisplay = (competencyMapping.role_comp_display_labels as Record<string, Record<string, string>>)[employee.jobRole];
      if (roleDisplay) {
        if (competencyCode.startsWith('Role_')) {
          return roleDisplay[competencyCode] || competencyCode;
        }

        // Fallback search for C# code like "Tech_DebuggingDepth"
        const roleLabels = (competencyMapping.role_comp_labels as Record<string, Record<string, string>>)[employee.jobRole];
        if (roleLabels) {
          const matchingKey = Object.keys(roleLabels).find(key => roleLabels[key] === competencyCode);
          if (matchingKey) {
            return roleDisplay[matchingKey] || competencyCode;
          }
        }
      }
    }

    return competencyCode;
  };

  // Group scores by competency for Radar chart representation
  const radarData = scores.length > 0
    ? Array.from(new Set(scores.map(s => s.competencyCode))).map(code => {
        const matching = scores.filter(s => s.competencyCode === code);
        const name = getCompetencyName(code);
        const avg = matching.reduce((sum, s) => sum + s.score, 0) / matching.length;
        return {
          subject: name.replace(/^(HR_|Tech_|Sales_|Fin_|Ops_|DS_|MLE_|QA_|DevOps_|Support_|EngMgr_|AM_|Mkt_|Acc_|FA_|Payroll_|FinMgr_|OpsSpec_|LogCoord_|ProdEng_|FieldSup_|OpsMgr_)/, ''),
          score: parseFloat(avg.toFixed(2)),
          fullMark: 5.0
        };
      })
    : [];

  // Helper to color Heatmap fields depending on score bounds
  const getHeatmapColor = (score: number) => {
    if (score < 2.0) return 'bg-danger/20 border-danger/30 text-danger';
    if (score < 3.0) return 'bg-warning/20 border-warning/30 text-warning';
    if (score < 4.0) return 'bg-success/20 border-success/30 text-success';
    return 'bg-primary/20 border-primary/30 text-primary';
  };

  // Setup list of 13 competencies for scorecards
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
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/employees')}
          className="flex items-center space-x-1 text-xs font-semibold text-muted hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Geri Dön</span>
        </button>
        <span className="text-xs text-muted">Çalışan Detay Modu</span>
      </div>

      {/* Employee Profile Header */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-card-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 text-2xl font-bold">
            {employee.fullName[0]}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-bold text-foreground">{employee.fullName}</h3>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20 uppercase tracking-wider">
                {employee.employeeCode}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">{employee.jobRole} • {employee.department}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-background border border-card-border rounded-xl p-1 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex-1 md:flex-initial rounded-lg py-2 px-4 text-xs font-bold transition ${
              activeTab === 'assessment'
                ? 'bg-card text-foreground shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Değerlendirme & Analiz
          </button>
          <button
            onClick={() => {
              if (!actionPlan) {
                toast.warning('Öncelikle değerlendirme sürecini tamamlayıp AI gelişim planını üretmelisiniz.');
                return;
              }
              setActiveTab('plan');
            }}
            className={`flex-1 md:flex-initial rounded-lg py-2 px-4 text-xs font-bold transition ${
              activeTab === 'plan'
                ? 'bg-card text-foreground shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Aksiyon Planı
          </button>
        </div>
      </div>

      {/* Mode 1: Assessment scoring and radar chart */}
      {activeTab === 'assessment' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Scoring or Heatmap */}
          <div className="lg:col-span-3 space-y-6">
            {/* If Assessment is Draft -> Input scorecard scores */}
            {activeAssessment && activeAssessment.status === 'Draft' ? (
              <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-6">
                <div className="flex items-center justify-between border-b border-card-border pb-4">
                  <div>
                    <h4 className="text-base font-bold text-foreground">360° Puan Girişleri</h4>
                    <p className="text-xs text-muted mt-0.5">Lütfen tüm yetkinlikler için derecelendirmeleri girin.</p>
                  </div>
                  {/* Evaluator Selector - Only visible for HR or Admin */}
                  {(user?.role === 'HR' || user?.role === 'Admin') ? (
                    <select
                      value={scorecardEvaluator}
                      onChange={(e) => {
                        const newEval = e.target.value as EvaluatorType;
                        setScorecardEvaluator(newEval);
                        
                        // Update scorecardInput for the new evaluator
                        const initial: Record<number, number> = {};
                        for (let i = 1; i <= 13; i++) {
                          initial[i] = 3.0;
                        }
                        const evaluatorScores = scores.filter(s => s.evaluatorType === newEval);
                        for (const s of evaluatorScores) {
                          initial[s.competencyId] = s.score;
                        }
                        setScorecardInput(initial);
                      }}
                      className="rounded-lg bg-card border border-card-border py-1.5 px-3 text-xs text-foreground outline-none cursor-pointer"
                    >
                      <option value="Manager">Yönetici Değerlendirmesi</option>
                      <option value="Self">Öz Değerlendirme</option>
                      <option value="Peer">Ekip Arkadaşı Değerlendirmesi</option>
                      <option value="Subordinate">Ast Değerlendirmesi</option>
                    </select>
                  ) : (
                    <span className="text-xs text-muted font-semibold bg-card border border-card-border py-1.5 px-3 rounded-lg">
                      {scorecardEvaluator === 'Self'
                        ? 'Öz Değerlendirme'
                        : scorecardEvaluator === 'Manager'
                        ? 'Yönetici Değerlendirmesi'
                        : scorecardEvaluator === 'Subordinate'
                        ? 'Ast Değerlendirmesi'
                        : 'Akran Değerlendirmesi'}
                    </span>
                  )}
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {competenciesMetadata.map((comp) => {
                    const label = getCompetencyName(comp.code);
                    const currentScore = scorecardInput[comp.id] || 3.0;
                    return (
                      <div key={comp.id} className="rounded-xl border border-card-border bg-card/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{label}</span>
                          <span className="text-xs font-bold text-primary">{currentScore.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={currentScore}
                          onChange={(e) => handleScoreChange(comp.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-card-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleSaveScores}
                    disabled={isActionLoading}
                    className="flex-1 rounded-xl bg-card border border-card-border hover:bg-card-border/50 py-3 text-xs font-semibold text-foreground transition"
                  >
                    Taslak Kaydet
                  </button>
                  <button
                    onClick={handleCompleteAssessment}
                    disabled={isActionLoading}
                    className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-3 text-xs font-semibold text-white transition shadow-lg shadow-primary/15"
                  >
                    Değerlendirmeyi Tamamla
                  </button>
                </div>
              </div>
            ) : activeAssessment && activeAssessment.status !== 'Draft' ? (
              // Heatmap summary
              <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-6">
                <div>
                  <h4 className="text-base font-bold text-foreground">Yetkinlik Dağılım Matrisi</h4>
                  <p className="text-xs text-muted mt-0.5">Değerlendirme sonucunda ortaya çıkan tüm yetkinlik detayları.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {competenciesMetadata.map((comp) => {
                    const label = getCompetencyName(comp.code);
                    const matchingScores = scores.filter(s => s.competencyCode === comp.code);
                    const avg = matchingScores.length > 0
                      ? matchingScores.reduce((sum, s) => sum + s.score, 0) / matchingScores.length
                      : 3.0;
                    return (
                      <div
                        key={comp.id}
                        className={`rounded-xl border p-4 flex items-center justify-between ${getHeatmapColor(avg)}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">{label}</p>
                          <p className="text-[10px] opacity-70 mt-0.5">{matchingScores.length} değerlendirme girdi</p>
                        </div>
                        <span className="text-sm font-black tracking-wider shrink-0 ml-3">{avg.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // No assessment at all
              <div className="glass-panel rounded-2xl p-10 text-center border border-card-border space-y-4">
                <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Başlatılmış Değerlendirme Yok</h4>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Bu çalışan için henüz aktif veya taslak bir değerlendirme süreci başlatılmamış.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Radar Chart + AI trigger */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-card-border">
              <h4 className="text-base font-bold text-foreground">360° Radar Grafiği</h4>
              <div className="mt-4 flex h-64 items-center justify-center">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#27272a" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#71717a' }} stroke="#27272a" />
                      <Radar name="Ortalama" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted">Grafik çizmek için yeterli veri yok.</p>
                )}
              </div>
            </div>

            {/* 360° Evaluator Assignments Panel */}
            {activeAssessment && (
              <div className="glass-panel rounded-2xl p-6 border border-card-border space-y-4">
                <h4 className="text-base font-bold text-foreground">360° Değerlendiriciler</h4>
                
                {/* Assignments List */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {assignments.length === 0 ? (
                    <p className="text-xs text-muted">Atanmış değerlendirici bulunmuyor.</p>
                  ) : (
                    assignments.map((assign) => (
                      <div key={assign.id} className="flex items-center justify-between rounded-xl bg-card/40 border border-card-border/60 p-3 text-xs">
                        <div>
                          <p className="font-bold text-foreground">{assign.evaluatorEmployeeName}</p>
                          <p className="text-[10px] text-muted mt-0.5">
                            İlişki: {assign.evaluatorType === 'Self' ? 'Kendi' : assign.evaluatorType === 'Manager' ? 'Yönetici' : assign.evaluatorType === 'Peer' ? 'Meslektaş' : 'Ast'}
                          </p>
                        </div>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          assign.isCompleted
                            ? 'bg-success/10 border-success/20 text-success'
                            : 'bg-warning/10 border-warning/20 text-warning'
                        }`}>
                          {assign.isCompleted ? 'Tamamladı' : 'Bekliyor'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Assignment Form for HR/Admin - only during draft */}
                {activeAssessment.status === 'Draft' && (user?.role === 'HR' || user?.role === 'Admin') && (
                  <form onSubmit={handleAddAssignment} className="border-t border-card-border/60 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-foreground">Yeni Değerlendirici Ekle</p>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      <select
                        required
                        value={selectedEvaluatorId || ''}
                        onChange={(e) => setSelectedEvaluatorId(Number(e.target.value))}
                        className="w-full rounded-xl bg-card border border-card-border py-2.5 px-3.5 text-xs text-foreground outline-none cursor-pointer focus:border-primary"
                      >
                        <option value="">Çalışan Seçin...</option>
                        {allEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName} ({emp.jobRole})
                          </option>
                        ))}
                      </select>

                      <div className="flex space-x-2">
                        <select
                          value={selectedEvaluatorType}
                          onChange={(e) => setSelectedEvaluatorType(e.target.value as EvaluatorType)}
                          className="flex-1 rounded-xl bg-card border border-card-border py-2.5 px-3 text-xs text-foreground outline-none cursor-pointer focus:border-primary"
                        >
                          <option value="Peer">Meslektaş (Peer)</option>
                          <option value="Subordinate">Ast (Subordinate)</option>
                          <option value="Manager">Yönetici (Manager)</option>
                        </select>

                        <button
                          type="submit"
                          disabled={isAssigning || !selectedEvaluatorId}
                          className="rounded-xl bg-primary hover:bg-primary-hover px-4 text-xs font-semibold text-white transition disabled:opacity-50"
                        >
                          {isAssigning ? '...' : 'Ekle'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* AI Generator Panel */}
            {activeAssessment && activeAssessment.status === 'Completed' && (
              <div className="glass-panel rounded-2xl p-6 border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent space-y-4">
                <div className="flex items-center space-x-2.5 text-primary">
                  <Cpu className="h-5 w-5 shrink-0" />
                  <h4 className="text-base font-bold text-foreground">AI Gelişim Planlayıcı</h4>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Çalışanın 360° değerlendirmesi tamamlandı. Yapay zeka motorunu tetikleyerek zayıf yetkinlikleri en uygun eğitim ve pratik aksiyonlarıyla eşleştirin.
                </p>
                <button
                  onClick={handleGenerateAIPlan}
                  disabled={isActionLoading}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-primary hover:bg-primary-hover py-3 px-4 font-semibold text-white shadow-lg shadow-primary/20 transition duration-150 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>AI Gelişim Planı Üret</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Action Plan Editor */}
      {activeTab === 'plan' && actionPlan && (
        <div className="space-y-6">
          {/* Plan Meta & Actions Header */}
          <div className="glass-panel rounded-2xl p-6 border border-card-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-bold text-foreground">Gelişim Planı Taslağı</h4>
                <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                  actionPlan.status === 'Sent'
                    ? 'bg-success/10 border-success/20 text-success'
                    : actionPlan.status === 'Approved'
                    ? 'bg-info/10 border-info/20 text-info'
                    : actionPlan.status === 'Cancelled'
                    ? 'bg-danger/10 border-danger/20 text-danger'
                    : 'bg-warning/10 border-warning/20 text-warning'
                }`}>
                  {actionPlan.status === 'Draft' ? 'Taslak' :
                   actionPlan.status === 'Edited' ? 'Düzenlendi' :
                   actionPlan.status === 'Approved' ? 'Onaylandı' :
                   actionPlan.status === 'Cancelled' ? 'İptal Edildi' : 'İletildi (Aktif)'}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Atanan Toplam Görev: {actionPlan.items.length} {(actionPlan.status === 'Sent' || actionPlan.status === 'Completed') && `(Tamamlanan: ${actionPlan.items.filter(i => i.taskStatus === 'Completed').length}/${actionPlan.items.length})`} • Oluşturma: {new Date(actionPlan.createdAt).toLocaleDateString('tr-TR')}
              </p>
            </div>

            {/* Lifecycle controls */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-1.5 rounded-xl border border-card-border bg-card hover:bg-card-border/50 py-2.5 px-4 text-xs font-semibold text-foreground transition"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>PDF Raporu İndir</span>
              </button>

              {/* Add manual item */}
              {actionPlan.status !== 'Sent' && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center space-x-1.5 rounded-xl border border-card-border bg-card hover:bg-card-border/50 py-2.5 px-4 text-xs font-semibold text-foreground transition"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Manuel Görev Ekle</span>
                </button>
              )}

              {/* Approve plan */}
              {(actionPlan.status === 'Draft' || actionPlan.status === 'Edited') && (
                <button
                  onClick={handleApprovePlan}
                  disabled={isActionLoading}
                  className="rounded-xl bg-info hover:bg-info/80 py-2.5 px-4 text-xs font-semibold text-white shadow-md transition"
                >
                  Planı Onayla
                </button>
              )}

              {/* Send plan to employee */}
              {actionPlan.status === 'Approved' && (
                <button
                  onClick={handleSendPlan}
                  disabled={isActionLoading}
                  className="rounded-xl bg-primary hover:bg-primary-hover py-2.5 px-4 text-xs font-semibold text-white shadow-md transition shadow-primary/10"
                >
                  Çalışana İlet
                </button>
              )}

              {/* Cancel Plan */}
              {(actionPlan.status === 'Draft' || actionPlan.status === 'Edited' || actionPlan.status === 'Approved') && (user?.role === 'HR' || user?.role === 'Manager' || user?.role === 'Admin') && (
                <button
                  onClick={handleCancelPlan}
                  disabled={isActionLoading}
                  className="rounded-xl bg-danger/10 border border-danger/20 hover:bg-danger/20 py-2.5 px-4 text-xs font-semibold text-danger transition"
                >
                  Planı İptal Et
                </button>
              )}
            </div>
          </div>

          {/* Action plan items list */}
          <div className="space-y-4">
            {(() => {
               const priorityWeights: Record<ActionPriority, number> = { High: 3, Medium: 2, Low: 1 };
              const sortedItems = [...actionPlan.items].sort((a, b) => {
                const isCompletedA = a.taskStatus === 'Completed';
                const isCompletedB = b.taskStatus === 'Completed';
                if (isCompletedA && !isCompletedB) return 1;
                if (!isCompletedA && isCompletedB) return -1;

                const weightA = priorityWeights[a.priority] || 0;
                const weightB = priorityWeights[b.priority] || 0;
                return weightB - weightA;
              });
              return sortedItems.map((item) => (
                <div key={item.id} className="glass-panel rounded-2xl p-6 border border-card-border flex flex-col md:flex-row justify-between gap-6 transition hover:border-card-border/80">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        item.source === 'AI'
                          ? 'bg-primary/10 border border-primary/20 text-primary'
                          : 'bg-info/10 border border-info/20 text-info'
                      }`}>
                        {item.source === 'AI' ? 'AI Önerisi' : 'Manuel'}
                      </span>
                      {item.taskStatus && (
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          item.taskStatus === 'Completed'
                            ? 'bg-success/10 border-success/20 text-success'
                            : item.taskStatus === 'InProgress'
                            ? 'bg-warning/10 border-warning/20 text-warning'
                            : item.taskStatus === 'Cancelled'
                            ? 'bg-danger/10 border-danger/20 text-danger'
                            : 'bg-info/10 border-info/20 text-info'
                        }`}>
                          {item.taskStatus === 'Completed' ? 'Tamamlandı' :
                           item.taskStatus === 'InProgress' ? 'Devam Ediyor' :
                           item.taskStatus === 'Cancelled' ? 'İptal Edildi' : 'Başlanmadı'}
                        </span>
                      )}
                      <h5 className="text-sm font-bold text-foreground truncate">{item.title}</h5>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                  </div>

                  {/* Edit inline configs */}
                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Select Priority */}
                    <select
                      value={item.priority}
                      disabled={actionPlan.status === 'Sent'}
                      onChange={(e) => handleUpdateItem(item.id, 'priority', e.target.value as ActionPriority)}
                      className="rounded-lg bg-card border border-card-border py-1.5 px-2.5 text-xs text-foreground outline-none cursor-pointer focus:border-primary disabled:opacity-50"
                    >
                      <option value="Low">Düşük Öncelik</option>
                      <option value="Medium">Orta Öncelik</option>
                      <option value="High">Yüksek Öncelik</option>
                    </select>

                    {/* Input Date */}
                    <div className="relative">
                      <input
                        type="date"
                        disabled={actionPlan.status === 'Sent'}
                        value={item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateItem(item.id, 'dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="rounded-lg bg-card border border-card-border py-1.5 px-2.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
                      />
                    </div>

                    {/* Delete Button */}
                    {actionPlan.status !== 'Sent' && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-danger/20 bg-danger/5 hover:bg-danger/10 text-danger transition duration-150"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Add Manual Item Modal */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-card-border space-y-6">
                <div>
                  <h4 className="text-base font-bold text-foreground">Yeni Gelişim Görevi Ekle</h4>
                  <p className="text-xs text-muted mt-0.5">Plan taslağına özel bir eğitim veya hedef ekleyin.</p>
                </div>

                <form onSubmit={handleAddManualItem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Başlık</label>
                    <input
                      type="text"
                      required
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Eğitim veya görev adı..."
                      className="w-full rounded-xl bg-card border border-card-border py-3 px-4 text-xs text-foreground placeholder-muted outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Açıklama</label>
                    <textarea
                      required
                      rows={3}
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Görevin detaylı açıklaması..."
                      className="w-full rounded-xl bg-card border border-card-border py-3 px-4 text-xs text-foreground placeholder-muted outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Öncelik</label>
                      <select
                        value={newItem.priority}
                        onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as ActionPriority })}
                        className="w-full rounded-xl bg-card border border-card-border py-3 px-3 text-xs text-foreground outline-none cursor-pointer focus:border-primary"
                      >
                        <option value="Low">Düşük</option>
                        <option value="Medium">Orta</option>
                        <option value="High">Yüksek</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={newItem.dueDate}
                        onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                        className="w-full rounded-xl bg-card border border-card-border py-3 px-3 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 rounded-xl border border-card-border bg-card hover:bg-card-border/50 py-3 text-xs font-semibold text-foreground transition"
                    >
                      Kapat
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-3 text-xs font-semibold text-white shadow-md transition"
                    >
                      Plana Ekle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
