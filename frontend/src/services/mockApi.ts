import { mockDb } from './mockData';
import actionsMaster from '../data/actions_master.json';
import competencyMapping from '../data/competency_mapping.json';
import {
  ApiResponse,
  PagedResponse,
  LoginResponse,
  UserSession,
  EmployeeDetail,
  Assessment,
  AssessmentScore,
  ActionPlan,
  ActionPlanItem,
  EmployeeTask,
  UserRole,
  EvaluatorType,
  ActionPriority,
  TaskStatus
} from '../types';

// Standard Delay to simulate network request
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Active Session state in memory for Mock Mode
let currentSession: UserSession | null = null;

// Setup initial session based on current storage
if (typeof window !== 'undefined') {
  const storedUser = localStorage.getItem('mock_current_user');
  if (storedUser) {
    currentSession = JSON.parse(storedUser);
  }
}

export const mockApi = {
  // Authentication
  login: async (email: string, password?: string): Promise<ApiResponse<LoginResponse>> => {
    await delay(400);
    let role: UserRole = 'Employee';
    let fullName = 'Ayşe Kaya';
    let employeeId: number | null = 1;

    if (email === 'admin@demo.com') {
      role = 'Admin';
      fullName = 'Admin User';
      employeeId = null;
    } else if (email === 'hr@demo.com') {
      role = 'HR';
      fullName = 'HR User';
      employeeId = null;
    } else if (email === 'manager@demo.com') {
      role = 'Manager';
      fullName = 'Mehmet Yılmaz';
      employeeId = 2;
    } else if (email === 'employee@demo.com') {
      role = 'Employee';
      fullName = 'Ayşe Kaya';
      employeeId = 1;
    } else {
      // Find employee by email or default
      const employees = mockDb.getEmployees();
      const matched = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        fullName = matched.fullName;
        employeeId = matched.id;
        role = matched.managerId === null ? 'Manager' : 'Employee';
      } else {
        return {
          success: false,
          message: 'E-posta adresi veya şifre hatalı.',
          data: null as any
        };
      }
    }

    currentSession = {
      userId: employeeId || 99,
      fullName,
      email,
      role,
      employeeId,
      isActive: true
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_current_user', JSON.stringify(currentSession));
      localStorage.setItem('mock_access_token', 'mock_jwt_access_token_' + role);
      localStorage.setItem('mock_refresh_token', 'mock_jwt_refresh_token_' + Date.now());
    }

    return {
      success: true,
      message: 'Giriş başarılı.',
      data: {
        accessToken: 'mock_jwt_access_token_' + role,
        refreshToken: 'mock_jwt_refresh_token_' + Date.now(),
        accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        userId: employeeId || 99,
        fullName,
        email,
        role,
        employeeId
      }
    };
  },

  logout: async (): Promise<ApiResponse<{}>> => {
    await delay(100);
    currentSession = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_current_user');
      localStorage.removeItem('mock_access_token');
      localStorage.removeItem('mock_refresh_token');
    }
    return {
      success: true,
      message: 'Çıkış başarılı.',
      data: {}
    };
  },

  getMe: async (): Promise<ApiResponse<UserSession>> => {
    await delay(50);
    if (!currentSession) {
      return {
        success: false,
        message: 'Yetkisiz erişim.',
        data: null as any
      };
    }
    return {
      success: true,
      message: null,
      data: currentSession
    };
  },

  // Employees
  getEmployees: async (pageNumber: number = 1, pageSize: number = 20): Promise<PagedResponse<EmployeeDetail>> => {
    await delay(300);
    let list = mockDb.getEmployees();

    // If Manager, filter only their team
    if (currentSession?.role === 'Manager' && currentSession.employeeId !== null) {
      list = list.filter((e) => e.managerId === currentSession?.employeeId || e.id === currentSession?.employeeId);
    }

    const totalCount = list.length;
    const startIndex = (pageNumber - 1) * pageSize;
    const paginated = list.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: paginated,
      totalCount,
      pageNumber,
      pageSize,
      totalPages
    };
  },

  getEmployeeById: async (id: number): Promise<ApiResponse<EmployeeDetail>> => {
    await delay(200);
    const employees = mockDb.getEmployees();
    const employee = employees.find((e) => e.id === id);
    if (!employee) {
      return {
        success: false,
        message: 'Çalışan bulunamadı.',
        data: null as any
      };
    }
    return {
      success: true,
      message: null,
      data: employee
    };
  },

  updateEmployee: async (id: number, data: Partial<EmployeeDetail>): Promise<ApiResponse<EmployeeDetail>> => {
    await delay(300);
    const employees = mockDb.getEmployees();
    const idx = employees.findIndex((e) => e.id === id);
    if (idx === -1) {
      return { success: false, message: 'Çalışan bulunamadı.', data: null as any };
    }
    employees[idx] = { ...employees[idx], ...data } as EmployeeDetail;
    mockDb.setEmployees(employees);
    return { success: true, message: 'Çalışan güncellendi.', data: employees[idx] };
  },

  getEmployeeFeatures: async (id: number, assessmentId: number): Promise<ApiResponse<any>> => {
    await delay(200);
    const employees = mockDb.getEmployees();
    const employee = employees.find((e) => e.id === id);
    if (!employee) {
      return { success: false, message: 'Çalışan bulunamadı.', data: null };
    }

    const allScores = mockDb.getScores();
    const assessmentScores = allScores.filter((s) => s.assessmentId === assessmentId);

    // Aggregate scores by competency code (compute average for each)
    const codes = mockDb.getCompetencyMetadata().map((c) => c.code);
    const aggregatedScores: Record<string, number> = {};
    const missingFeatures: string[] = [];

    for (const code of codes) {
      const compScores = assessmentScores.filter((s) => s.competencyCode === code);
      if (compScores.length === 0) {
        missingFeatures.push(code);
      } else {
        const sum = compScores.reduce((acc, curr) => acc + curr.score, 0);
        aggregatedScores[code] = parseFloat((sum / compScores.length).toFixed(2));
      }
    }

    if (missingFeatures.length > 0) {
      return {
        success: false,
        message: `Eksik özellikler: ${missingFeatures.join(', ')}`,
        data: { missingFeatures } as any
      };
    }

    return {
      success: true,
      message: null,
      data: {
        age: employee.age,
        attrition: employee.attrition,
        businessTravel: employee.businessTravel,
        department: employee.department,
        distanceFromHome: employee.distanceFromHome,
        education: employee.education,
        educationField: employee.educationField,
        environmentSatisfaction: employee.environmentSatisfaction,
        gender: employee.gender,
        jobRole: employee.jobRole,
        jobSatisfaction: employee.jobSatisfaction,
        maritalStatus: employee.maritalStatus,
        workLifeBalance: employee.workLifeBalance,
        totalWorkingYears: employee.totalWorkingYears,
        yearsAtCompany: employee.yearsAtCompany,
        yearsInCurrentRole: employee.yearsInCurrentRole,
        yearsWithCurrManager: employee.yearsWithCurrManager,
        performanceScore: employee.performanceScore,
        core_Communication: aggregatedScores['Core_Communication'],
        core_Teamwork: aggregatedScores['Core_Teamwork'],
        core_ProblemSolving: aggregatedScores['Core_ProblemSolving'],
        core_Adaptability: aggregatedScores['Core_Adaptability'],
        core_Initiative: aggregatedScores['Core_Initiative'],
        core_Accountability: aggregatedScores['Core_Accountability'],
        core_LearningAgility: aggregatedScores['Core_LearningAgility'],
        core_TimeManagement: aggregatedScores['Core_TimeManagement'],
        dept_Comp1: aggregatedScores['Dept_Comp1'],
        dept_Comp2: aggregatedScores['Dept_Comp2'],
        dept_Comp3: aggregatedScores['Dept_Comp3'],
        role_Comp1: aggregatedScores['Role_Comp1'],
        role_Comp2: aggregatedScores['Role_Comp2']
      }
    };
  },

  // Assessments
  getEmployeeAssessments: async (
    employeeId: number,
    pageNumber: number = 1,
    pageSize: number = 20
  ): Promise<PagedResponse<Assessment>> => {
    await delay(200);
    const assessments = mockDb.getAssessments().filter((a) => a.employeeId === employeeId);
    const totalCount = assessments.length;
    const startIndex = (pageNumber - 1) * pageSize;
    const paginated = assessments.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: paginated,
      totalCount,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  },

  getAssessmentById: async (id: number): Promise<ApiResponse<Assessment>> => {
    await delay(100);
    const assessments = mockDb.getAssessments();
    const assessment = assessments.find((a) => a.id === id);
    if (!assessment) {
      return { success: false, message: 'Değerlendirme bulunamadı.', data: null as any };
    }
    return { success: true, message: null, data: assessment };
  },

  createAssessment: async (employeeId: number, cycleId: number): Promise<ApiResponse<Assessment>> => {
    await delay(300);
    const employees = mockDb.getEmployees();
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) {
      return { success: false, message: 'Çalışan bulunamadı.', data: null as any };
    }

    const assessments = mockDb.getAssessments();
    const newId = assessments.length > 0 ? Math.max(...assessments.map((a) => a.id)) + 1 : 1;
    const newAssessment: Assessment = {
      id: newId,
      employeeId,
      employeeName: emp.fullName,
      cycleId,
      cycleName: cycleId === 1 ? '2024 Q4 Değerlendirmesi' : '2026 Dönem Değerlendirmesi',
      overallScore: null,
      status: 'Draft',
      createdByUserId: currentSession?.userId || 99,
      createdByUserName: currentSession?.fullName || 'Sistem',
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    assessments.push(newAssessment);
    mockDb.setAssessments(assessments);

    return { success: true, message: 'Değerlendirme oluşturuldu.', data: newAssessment };
  },

  completeAssessment: async (id: number): Promise<ApiResponse<Assessment>> => {
    await delay(300);
    const assessments = mockDb.getAssessments();
    const idx = assessments.findIndex((a) => a.id === id);
    if (idx === -1) {
      return { success: false, message: 'Değerlendirme bulunamadı.', data: null as any };
    }

    // Ensure all 13 competencies have at least one score
    const scores = mockDb.getScores().filter((s) => s.assessmentId === id);
    const uniqueCompetencies = new Set(scores.map((s) => s.competencyCode));

    if (uniqueCompetencies.size < 13) {
      return {
        success: false,
        message: 'Tüm yetkinlik skorları girilmeden değerlendirme tamamlanamaz.',
        data: null as any
      };
    }

    // Calculate overall score (average of all scores)
    const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    assessments[idx].status = 'Completed';
    assessments[idx].overallScore = parseFloat(avg.toFixed(2));
    assessments[idx].updatedAt = new Date().toISOString();
    mockDb.setAssessments(assessments);

    return { success: true, message: 'Değerlendirme tamamlandı.', data: assessments[idx] };
  },

  getAssessmentScores: async (id: number): Promise<ApiResponse<AssessmentScore[]>> => {
    await delay(150);
    const scores = mockDb.getScores().filter((s) => s.assessmentId === id);
    return { success: true, message: null, data: scores };
  },

  upsertAssessmentScore: async (
    assessmentId: number,
    competencyId: number,
    evaluatorType: EvaluatorType,
    score: number
  ): Promise<ApiResponse<AssessmentScore>> => {
    await delay(100);
    if (score < 0 || score > 5.0) {
      return { success: false, message: 'Skor 0.0 ve 5.0 arasında olmalıdır.', data: null as any };
    }

    const metadata = mockDb.getCompetencyMetadata().find((m) => m.id === competencyId);
    if (!metadata) {
      return { success: false, message: 'Yetkinlik bulunamadı.', data: null as any };
    }

    const allScores = mockDb.getScores();
    const existingIdx = allScores.findIndex(
      (s) =>
        s.assessmentId === assessmentId &&
        s.competencyId === competencyId &&
        s.evaluatorType === evaluatorType
    );

    let updatedOrNewScore: AssessmentScore;
    if (existingIdx !== -1) {
      allScores[existingIdx].score = score;
      updatedOrNewScore = allScores[existingIdx];
    } else {
      const newId = allScores.length > 0 ? Math.max(...allScores.map((s) => s.id)) + 1 : 1;
      updatedOrNewScore = {
        id: newId,
        assessmentId,
        competencyId,
        competencyCode: metadata.code,
        competencyName: metadata.name,
        evaluatorType,
        score
      };
      allScores.push(updatedOrNewScore);
    }

    mockDb.setScores(allScores);
    return { success: true, message: 'Skor kaydedildi.', data: updatedOrNewScore };
  },

  // Action Plans & AI Recommendation Logic
  generateActionPlan: async (assessmentId: number, topK: number = 13): Promise<ApiResponse<any>> => {
    await delay(600);
    const assessments = mockDb.getAssessments();
    const assessmentIdx = assessments.findIndex((a) => a.id === assessmentId);
    if (assessmentIdx === -1) {
      return { success: false, message: 'Değerlendirme bulunamadı.', data: null };
    }

    const assessment = assessments[assessmentIdx];
    if (assessment.status !== 'Completed') {
      return {
        success: false,
        message: 'Değerlendirme tamamlanmış (Completed) olmalıdır.',
        data: null
      };
    }

    const employee = mockDb.getEmployees().find((e) => e.id === assessment.employeeId);
    if (!employee) {
      return { success: false, message: 'Çalışan bulunamadı.', data: null };
    }

    // Get aggregated scores
    const allScores = mockDb.getScores();
    const assessmentScores = allScores.filter((s) => s.assessmentId === assessmentId);
    const codes = mockDb.getCompetencyMetadata();
    const scoresMap: Record<string, number> = {};

    for (const item of codes) {
      const compScores = assessmentScores.filter((s) => s.competencyCode === item.code);
      if (compScores.length > 0) {
        scoresMap[item.code] = compScores.reduce((sum, s) => sum + s.score, 0) / compScores.length;
      } else {
        scoresMap[item.code] = 3.0; // default fallback if missing
      }
    }

    // AI recommendation simulation based on scripts/labeling.py logic
    const selectedActions: any[] = [];
    const actionsByComp: Record<string, any[]> = {};

    // Group actions from catalog by competency
    for (const a of actionsMaster as any[]) {
      const tc = a.target_competency;
      if (!actionsByComp[tc]) {
        actionsByComp[tc] = [];
      }
      actionsByComp[tc].push(a);
    }

    // Sort catalog actions inside groups by action_id to map index easily
    for (const tc in actionsByComp) {
      actionsByComp[tc].sort((x, y) => x.action_id.localeCompare(y.action_id));
    }

    const getBaseActionId = (compCode: string, score: number): string => {
      const list = actionsByComp[compCode] || [];
      for (const act of list) {
        const rules = act.selection_rules;
        if (score >= rules.min_score && score <= rules.max_score) {
          return act.action_id;
        }
      }
      if (list.length === 0) return '';
      if (score < list[0].selection_rules.min_score) return list[0].action_id;
      return list[list.length - 1].action_id;
    };

    const getActionByIndex = (compCode: string, index: number): string => {
      const list = actionsByComp[compCode] || [];
      const idx = Math.max(0, Math.min(index, list.length - 1));
      return list[idx]?.action_id || '';
    };

    const getIndexByAction = (compCode: string, actionId: string): number => {
      const list = actionsByComp[compCode] || [];
      return list.findIndex((a) => a.action_id === actionId);
    };

    // Evaluate labeling logic for each of the 13 competencies
    for (const item of codes) {
      const compCode = item.code;
      const score = scoresMap[compCode];
      
      // Step A: Base Selection
      let recommendedActionId = getBaseActionId(compCode, score);

      // Step B: Expert Override Rules
      // Rule 1: Manager Penalty
      if (employee.jobRole.includes('Manager')) {
        if ((compCode === 'Core_Accountability' || compCode === 'Core_Initiative') && score < 2.5) {
          recommendedActionId = getActionByIndex(compCode, 0); // Force hardest Action_01
        }
      }

      // Rule 2: Burnout Shield
      if (employee.workLifeBalance <= 2 && employee.jobSatisfaction <= 2) {
        const list = actionsByComp[compCode] || [];
        recommendedActionId = getActionByIndex(compCode, list.length - 1); // Force easiest Action_04/03
      }

      // Rule 3: Sales Precision
      if (employee.department === 'Sales & Marketing' && compCode === 'Core_Communication' && score < 3.0) {
        recommendedActionId = getActionByIndex(compCode, 0); // Force hardest Action_01
      }

      // Rule 4: Tech Imperative
      if (employee.department === 'Technology' && compCode === 'Core_ProblemSolving' && score < 3.0) {
        recommendedActionId = getActionByIndex(compCode, 0); // Force hardest Action_01
      }

      // Rule 5: Veteran Refresh
      if (employee.totalWorkingYears >= 10 && employee.yearsAtCompany >= 5) {
        if ((compCode.startsWith('Dept_') || compCode.startsWith('Role_')) && score < 2.0) {
          recommendedActionId = getActionByIndex(compCode, 1); // Map to Action_02 (Mental Coaching) instead of 01
        }
      }

      // Rule 6: Toxic Performance (Top 20% performance score)
      if (employee.performanceScore >= 3.8 && compCode === 'Core_Teamwork' && score < 2.0) {
        recommendedActionId = getActionByIndex(compCode, 2); // Map to Action_03 (Self-Reflection)
      }

      // Rule 7: Onboarding SOS
      if (employee.yearsAtCompany <= 2 && compCode === 'Core_Adaptability' && score < 2.5) {
        recommendedActionId = getActionByIndex(compCode, 0); // Map to Action_01 (immersion adaptability)
      }

      // Step C: Noise / Human Error (10% chance drift)
      if (Math.random() < 0.10) {
        const currIdx = getIndexByAction(compCode, recommendedActionId);
        const list = actionsByComp[compCode] || [];
        let shift = 1;
        if (currIdx === 0) {
          shift = 1;
        } else if (currIdx === list.length - 1) {
          shift = -1;
        } else {
          shift = Math.random() < 0.5 ? -1 : 1;
        }
        recommendedActionId = getActionByIndex(compCode, currIdx + shift);
      }

      // Add to list
      if (recommendedActionId) {
        const actionObj = (actionsMaster as any[]).find((a) => a.action_id === recommendedActionId);
        if (actionObj) {
          selectedActions.push(actionObj);
        }
      }
    }

    // Now instantiate a new ActionPlan
    const actionPlans = mockDb.getActionPlans();
    const newPlanId = actionPlans.length > 0 ? Math.max(...actionPlans.map((p) => p.id)) + 1 : 1;
    
    // Convert selected action catalog definitions to ActionPlanItem objects
    const planItems: ActionPlanItem[] = selectedActions.map((act, index) => {
      let title = act.content?.title || '';
      let description = act.content?.description || '';

      // Department overrides content
      if (act.action_category === 'Department' && act.content_by_department) {
        // Resolve abstract name
        const mappedName = (competencyMapping.dept_comp_labels as any)[employee.department]?.[act.target_competency] || '';
        const deptContent = act.content_by_department[employee.department];
        if (deptContent) {
          title = `${deptContent.title}`;
          description = `Çalışanın ${employee.department} departmanı bünyesindeki ${mappedName} alanını güçlendirmek için ${deptContent.delivery_type.toLowerCase()} görevidir. Kaynak: ${deptContent.resource}`;
        }
      }

      // Role overrides content
      if (act.action_category === 'Role' && act.content_by_role) {
        const mappedName = (competencyMapping.role_comp_labels as any)[employee.jobRole]?.[act.target_competency] || '';
        const roleContent = act.content_by_role[employee.jobRole];
        if (roleContent) {
          title = `${roleContent.title}`;
          description = `Çalışanın ${employee.jobRole} rolüne özgü ${mappedName} alanındaki becerilerini pekiştirmek üzere tasarlanmış ${roleContent.delivery_type.toLowerCase()} çalışmasıdır. Kaynak: ${roleContent.resource}`;
        }
      }

      // Map difficulty to priority
      let priority: ActionPriority = 'Medium';
      if (act.difficulty === 'High' || act.difficulty === 'Hard') priority = 'High';
      else if (act.difficulty === 'Low' || act.difficulty === 'Easy') priority = 'Low';

      return {
        id: index + 1,
        actionPlanId: newPlanId,
        actionCatalogId: null,
        aiPredictedActionId: act.action_id,
        title,
        description,
        priority,
        dueDate: null,
        source: 'AI',
        orderNo: index + 1
      };
    });

    const newPlan: ActionPlan = {
      id: newPlanId,
      assessmentId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      createdByUserId: currentSession?.userId || 99,
      createdByUserName: currentSession?.fullName || 'HR User',
      status: 'Draft',
      approvedAt: null,
      sentAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      items: planItems.slice(0, topK) // respect topK limit
    };

    // Update assessment status
    assessments[assessmentIdx].status = 'ActionPlanGenerated';
    assessments[assessmentIdx].updatedAt = new Date().toISOString();
    mockDb.setAssessments(assessments);

    actionPlans.push(newPlan);
    mockDb.setActionPlans(actionPlans);

    return {
      success: true,
      message: 'AI Aksiyon planı başarıyla üretildi.',
      data: {
        actionPlanId: newPlan.id,
        status: newPlan.status,
        itemCount: newPlan.items.length,
        createdAt: newPlan.createdAt
      }
    };
  },

  getActionPlanById: async (id: number): Promise<ApiResponse<ActionPlan>> => {
    await delay(150);
    const plans = mockDb.getActionPlans();
    const plan = plans.find((p) => p.id === id);
    if (!plan) {
      return { success: false, message: 'Aksiyon planı bulunamadı.', data: null as any };
    }
    return { success: true, message: null, data: plan };
  },

  getEmployeeActionPlans: async (employeeId: number): Promise<ApiResponse<ActionPlan[]>> => {
    await delay(200);
    const plans = mockDb.getActionPlans().filter((p) => p.employeeId === employeeId);
    return { success: true, message: null, data: plans };
  },

  updateActionPlanItem: async (
    planId: number,
    itemId: number,
    data: { title: string; description: string; priority: ActionPriority; dueDate: string | null; orderNo: number }
  ): Promise<ApiResponse<ActionPlanItem>> => {
    await delay(150);
    const plans = mockDb.getActionPlans();
    const planIdx = plans.findIndex((p) => p.id === planId);
    if (planIdx === -1) {
      return { success: false, message: 'Plan bulunamadı.', data: null as any };
    }

    const plan = plans[planIdx];
    const itemIdx = plan.items.findIndex((i) => i.id === itemId);
    if (itemIdx === -1) {
      return { success: false, message: 'Plan kalemi bulunamadı.', data: null as any };
    }

    // Apply updates
    const updatedItem = { ...plan.items[itemIdx], ...data };
    plan.items[itemIdx] = updatedItem;
    
    // Status to Edited if Draft/Edited
    if (plan.status === 'Draft') {
      plan.status = 'Edited';
    }
    plan.updatedAt = new Date().toISOString();
    plans[planIdx] = plan;
    mockDb.setActionPlans(plans);

    return { success: true, message: 'Görev güncellendi.', data: updatedItem };
  },

  addActionPlanItem: async (
    planId: number,
    data: { title: string; description: string; priority: ActionPriority; dueDate: string | null; actionCatalogId?: number | null }
  ): Promise<ApiResponse<ActionPlanItem>> => {
    await delay(200);
    const plans = mockDb.getActionPlans();
    const planIdx = plans.findIndex((p) => p.id === planId);
    if (planIdx === -1) {
      return { success: false, message: 'Plan bulunamadı.', data: null as any };
    }

    const plan = plans[planIdx];
    const newId = plan.items.length > 0 ? Math.max(...plan.items.map((i) => i.id)) + 1 : 1;
    const newItem: ActionPlanItem = {
      id: newId,
      actionPlanId: planId,
      actionCatalogId: data.actionCatalogId || null,
      aiPredictedActionId: null,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
      source: 'Manual',
      orderNo: plan.items.length + 1
    };

    plan.items.push(newItem);
    if (plan.status === 'Draft') {
      plan.status = 'Edited';
    }
    plan.updatedAt = new Date().toISOString();
    plans[planIdx] = plan;
    mockDb.setActionPlans(plans);

    return { success: true, message: 'Yeni aksiyon eklendi.', data: newItem };
  },

  deleteActionPlanItem: async (planId: number, itemId: number): Promise<ApiResponse<{}>> => {
    await delay(100);
    const plans = mockDb.getActionPlans();
    const planIdx = plans.findIndex((p) => p.id === planId);
    if (planIdx === -1) {
      return { success: false, message: 'Plan bulunamadı.', data: {} };
    }

    const plan = plans[planIdx];
    plan.items = plan.items.filter((i) => i.id !== itemId);
    if (plan.status === 'Draft') {
      plan.status = 'Edited';
    }
    plan.updatedAt = new Date().toISOString();
    plans[planIdx] = plan;
    mockDb.setActionPlans(plans);

    return { success: true, message: 'Aksiyon silindi.', data: {} };
  },

  approveActionPlan: async (id: number): Promise<ApiResponse<ActionPlan>> => {
    await delay(300);
    const plans = mockDb.getActionPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) {
      return { success: false, message: 'Plan bulunamadı.', data: null as any };
    }

    plans[idx].status = 'Approved';
    plans[idx].approvedAt = new Date().toISOString();
    plans[idx].updatedAt = new Date().toISOString();
    mockDb.setActionPlans(plans);

    // Update Assessment status as well
    const assessments = mockDb.getAssessments();
    const assIdx = assessments.findIndex((a) => a.id === plans[idx].assessmentId);
    if (assIdx !== -1) {
      assessments[assIdx].status = 'Approved';
      mockDb.setAssessments(assessments);
    }

    return { success: true, message: 'Gelişim planı onaylandı.', data: plans[idx] };
  },

  sendActionPlan: async (id: number): Promise<ApiResponse<ActionPlan>> => {
    await delay(400);
    const plans = mockDb.getActionPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) {
      return { success: false, message: 'Plan bulunamadı.', data: null as any };
    }

    const plan = plans[idx];
    plan.status = 'Sent';
    plan.sentAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    plans[idx] = plan;
    mockDb.setActionPlans(plans);

    // Update Assessment status
    const assessments = mockDb.getAssessments();
    const assIdx = assessments.findIndex((a) => a.id === plan.assessmentId);
    if (assIdx !== -1) {
      assessments[assIdx].status = 'SentToEmployee';
      mockDb.setAssessments(assessments);
    }

    // Generate EmployeeTasks from ActionPlanItems
    const tasks = mockDb.getTasks();
    const existingPlanTaskIds = new Set(tasks.filter((t) => t.employeeId === plan.employeeId).map(t => t.actionPlanItemId));
    
    plan.items.forEach((item) => {
      // Avoid duplicate tasks if plan is resent
      const isAlreadyGenerated = plan.items.some((item) => existingPlanTaskIds.has(item.id));
      if (!isAlreadyGenerated) {
        const newTaskId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
        const newTask: EmployeeTask = {
          id: newTaskId,
          actionPlanItemId: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          employeeId: plan.employeeId,
          employeeName: plan.employeeName,
          assignedByUserId: plan.createdByUserId,
          assignedByUserName: plan.createdByUserName,
          status: 'Assigned',
          assignedAt: new Date().toISOString(),
          dueDate: item.dueDate,
          completedAt: null
        };
        tasks.push(newTask);
      }
    });

    mockDb.setTasks(tasks);
    return { success: true, message: 'Gelişim planı çalışana iletildi, görevler oluşturuldu.', data: plan };
  },

  // Employee Tasks
  getMyTasks: async (pageNumber: number = 1, pageSize: number = 20): Promise<PagedResponse<EmployeeTask>> => {
    await delay(200);
    if (!currentSession || currentSession.employeeId === null) {
      return { success: false, data: [], totalCount: 0, pageNumber, pageSize, totalPages: 0 };
    }

    const tasks = mockDb.getTasks().filter((t) => t.employeeId === currentSession?.employeeId);
    const totalCount = tasks.length;
    const startIndex = (pageNumber - 1) * pageSize;
    const paginated = tasks.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: paginated,
      totalCount,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  },

  getTaskById: async (id: number): Promise<ApiResponse<EmployeeTask>> => {
    await delay(100);
    const tasks = mockDb.getTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      return { success: false, message: 'Görev bulunamadı.', data: null as any };
    }
    return { success: true, message: null, data: task };
  },

  updateTaskStatus: async (id: number, newStatus: TaskStatus): Promise<ApiResponse<EmployeeTask>> => {
    await delay(200);
    const tasks = mockDb.getTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      return { success: false, message: 'Görev bulunamadı.', data: null as any };
    }

    const currentStatus = tasks[idx].status;

    // Validate state transitions matching API_DOCUMENTATION:
    // Assigned -> InProgress -> Completed
    // Assigned -> Cancelled
    // InProgress -> Cancelled
    let isValid = false;
    if (currentStatus === 'Assigned' && (newStatus === 'InProgress' || newStatus === 'Cancelled')) {
      isValid = true;
    } else if (currentStatus === 'InProgress' && (newStatus === 'Completed' || newStatus === 'Cancelled')) {
      isValid = true;
    }

    if (!isValid) {
      return {
        success: false,
        message: `Geçersiz durum geçişi: ${currentStatus} -> ${newStatus}`,
        data: null as any
      };
    }

    tasks[idx].status = newStatus;
    if (newStatus === 'Completed') {
      tasks[idx].completedAt = new Date().toISOString();
    }
    
    mockDb.setTasks(tasks);
    
    // Check if all tasks for the parent ActionPlan are completed
    // If so, we could update action plan status to Completed
    const planItem = tasks[idx].actionPlanItemId;
    // (Optional trigger to mark plan completed in mock db)
    
    return { success: true, message: 'Görev durumu güncellendi.', data: tasks[idx] };
  }
};
