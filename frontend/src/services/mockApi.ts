/* eslint-disable */
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
  TaskStatus,
  AssessmentAssignment,
  MySurvey
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

  createEmployee: async (data: Omit<EmployeeDetail, 'id' | 'managerName'>): Promise<ApiResponse<EmployeeDetail>> => {
    await delay(300);
    const employees = mockDb.getEmployees();
    const newId = employees.length > 0 ? Math.max(...employees.map((e) => e.id)) + 1 : 1;
    
    // Auto-generate employeeCode if not provided
    const employeeCode = data.employeeCode || `EMP${String(newId).padStart(3, '0')}`;
    
    // Find manager name if managerId is provided
    let managerName = null;
    if (data.managerId) {
      const manager = employees.find((e) => e.id === data.managerId);
      if (manager) {
        managerName = manager.fullName;
      }
    }

    // Determine string values for department and jobRole based on departmentId and jobRoleId
    let department = 'Technology';
    if (data.departmentId === 1) department = 'Human Resources';
    else if (data.departmentId === 2) department = 'Technology';
    else if (data.departmentId === 3) department = 'Sales & Marketing';
    else if (data.departmentId === 4) department = 'Finance & Accounting';
    else if (data.departmentId === 5) department = 'Operations';

    // Job Roles list matching IDs
    const jobRoleMapping: Record<number, string> = {
      1: 'HR Specialist',
      2: 'Recruiter',
      3: 'HR Manager',
      4: 'Software Engineer',
      5: 'Senior Software Engineer',
      6: 'Data Scientist',
      7: 'Machine Learning Engineer',
      8: 'QA Engineer',
      9: 'DevOps Engineer',
      10: 'Technical Support Engineer',
      11: 'Engineering Manager',
      12: 'Sales Executive',
      13: 'Sales Representative',
      14: 'Account Manager',
      15: 'Marketing Specialist',
      16: 'Accountant',
      17: 'Financial Analyst',
      18: 'Payroll Specialist',
      19: 'Finance Manager',
      20: 'Operations Specialist',
      21: 'Logistics Coordinator',
      22: 'Production Engineer',
      23: 'Field Supervisor',
      24: 'Operations Manager'
    };
    
    const jobRole = jobRoleMapping[data.jobRoleId] || 'Software Engineer';

    const newEmployee: EmployeeDetail = {
      ...data,
      id: newId,
      employeeCode,
      managerName,
      department,
      jobRole,
      isActive: true
    } as EmployeeDetail;

    employees.push(newEmployee);
    mockDb.setEmployees(employees);
    return { success: true, message: 'Çalışan başarıyla oluşturuldu.', data: newEmployee };
  },

  updateEmployee: async (id: number, data: Partial<EmployeeDetail>): Promise<ApiResponse<EmployeeDetail>> => {
    await delay(300);
    const employees = mockDb.getEmployees();
    const idx = employees.findIndex((e) => e.id === id);
    if (idx === -1) {
      return { success: false, message: 'Çalışan bulunamadı.', data: null as any };
    }

    let managerName = employees[idx].managerName;
    if (data.managerId !== undefined) {
      if (data.managerId) {
        const manager = employees.find((e) => e.id === Number(data.managerId));
        managerName = manager ? manager.fullName : null;
      } else {
        managerName = null;
      }
    }

    let department = employees[idx].department;
    if (data.departmentId !== undefined) {
      if (data.departmentId === 1) department = 'Human Resources';
      else if (data.departmentId === 2) department = 'Technology';
      else if (data.departmentId === 3) department = 'Sales & Marketing';
      else if (data.departmentId === 4) department = 'Finance & Accounting';
      else if (data.departmentId === 5) department = 'Operations';
    }

    const jobRoleMapping: Record<number, string> = {
      1: 'HR Specialist',
      2: 'Recruiter',
      3: 'HR Manager',
      4: 'Software Engineer',
      5: 'Senior Software Engineer',
      6: 'Data Scientist',
      7: 'Machine Learning Engineer',
      8: 'QA Engineer',
      9: 'DevOps Engineer',
      10: 'Technical Support Engineer',
      11: 'Engineering Manager',
      12: 'Sales Executive',
      13: 'Sales Representative',
      14: 'Account Manager',
      15: 'Marketing Specialist',
      16: 'Accountant',
      17: 'Financial Analyst',
      18: 'Payroll Specialist',
      19: 'Finance Manager',
      20: 'Operations Specialist',
      21: 'Logistics Coordinator',
      22: 'Production Engineer',
      23: 'Field Supervisor',
      24: 'Operations Manager'
    };

    let jobRole = employees[idx].jobRole;
    if (data.jobRoleId !== undefined) {
      jobRole = jobRoleMapping[data.jobRoleId] || jobRole;
    }

    const updatedEmployee: EmployeeDetail = {
      ...employees[idx],
      ...data,
      managerName,
      department,
      jobRole
    } as EmployeeDetail;

    employees[idx] = updatedEmployee;
    mockDb.setEmployees(employees);
    return { success: true, message: 'Çalışan bilgileri başarıyla güncellendi.', data: updatedEmployee };
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
    
    // Check if there is an active incomplete assessment
    const activeAss = mockDb.getAssessments().find(
      (a) => a.employeeId === employeeId && a.status !== 'Completed'
    );
    if (activeAss) {
      return {
        success: false,
        message: 'Çalışanın devam eden aktif bir değerlendirme süreci bulunmaktadır. Yeni bir değerlendirme süreci başlatılamaz.',
        data: null as any
      };
    }

    // Check if there is an active incomplete plan
    const activePlan = mockDb.getActionPlans().find(
      (p) => p.employeeId === employeeId && p.status !== 'Completed' && p.status !== 'Cancelled'
    );
    if (activePlan) {
      return {
        success: false,
        message: 'Çalışanın devam eden tamamlanmamış bir gelişim planı bulunmaktadır. Yeni bir değerlendirme süreci başlatılamaz.',
        data: null as any
      };
    }

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

    // Automatically generate assignments
    const assignments = mockDb.getAssignments();
    const nextAssignmentId = () => assignments.length > 0 ? Math.max(...assignments.map((a) => a.id)) + 1 : 1;

    // Self assignment
    assignments.push({
      id: nextAssignmentId(),
      assessmentId: newId,
      evaluatorEmployeeId: employeeId,
      evaluatorEmployeeName: emp.fullName,
      evaluatorType: 'Self',
      isCompleted: false,
      completedAt: null
    });

    // Manager assignment
    if (emp.managerId) {
      const mgr = employees.find(e => e.id === emp.managerId);
      if (mgr) {
        assignments.push({
          id: nextAssignmentId(),
          assessmentId: newId,
          evaluatorEmployeeId: emp.managerId,
          evaluatorEmployeeName: mgr.fullName,
          evaluatorType: 'Manager',
          isCompleted: false,
          completedAt: null
        });
      }
    }
    mockDb.setAssignments(assignments);

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

    // Calculate overall score (average of the 13 competency averages)
    const metadata = mockDb.getCompetencyMetadata();
    let compSum = 0;
    for (const comp of metadata) {
      const compScores = scores.filter(s => s.competencyId === comp.id);
      const compAvg = compScores.length > 0 ? compScores.reduce((sum, s) => sum + s.score, 0) / compScores.length : 3.0;
      compSum += compAvg;
    }
    const avg = compSum / metadata.length;

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
    score: number,
    evaluatorEmployeeId?: number | null
  ): Promise<ApiResponse<AssessmentScore>> => {
    await delay(100);
    if (score < 0 || score > 5.0) {
      return { success: false, message: 'Skor 0.0 ve 5.0 arasında olmalıdır.', data: null as any };
    }

    const metadata = mockDb.getCompetencyMetadata().find((m) => m.id === competencyId);
    if (!metadata) {
      return { success: false, message: 'Yetkinlik bulunamadı.', data: null as any };
    }

    const targetEvaluatorId = evaluatorEmployeeId ?? (currentSession?.employeeId || 99);

    const allScores = mockDb.getScores();
    const existingIdx = allScores.findIndex(
      (s) =>
        s.assessmentId === assessmentId &&
        s.competencyId === competencyId &&
        s.evaluatorType === evaluatorType &&
        s.evaluatorEmployeeId === targetEvaluatorId
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
        evaluatorEmployeeId: targetEvaluatorId,
        evaluatorType,
        score
      };
      allScores.push(updatedOrNewScore);
    }

    mockDb.setScores(allScores);
    return { success: true, message: 'Skor kaydedildi.', data: updatedOrNewScore };
  },

  submitBulkScores: async (
    id: number,
    evaluatorEmployeeId: number,
    scoresList: { competencyId: number; score: number }[],
    evaluatorType?: EvaluatorType
  ): Promise<ApiResponse<AssessmentScore[]>> => {
    await delay(300);
    const metadataList = mockDb.getCompetencyMetadata();
    const allScores = mockDb.getScores();
    const addedOrUpdated: AssessmentScore[] = [];

    // Find evaluator employee and determine evaluator type
    const employees = mockDb.getEmployees();
    const evaluatorEmp = employees.find(e => e.id === evaluatorEmployeeId);
    const assessment = mockDb.getAssessments().find(a => a.id === id);
    if (!assessment) {
      return { success: false, message: 'Değerlendirme bulunamadı.', data: [] };
    }
    
    // Determine type
    let determinedType: EvaluatorType = evaluatorType || 'Peer';
    if (!evaluatorType) {
      if (evaluatorEmployeeId === assessment.employeeId) {
        determinedType = 'Self';
      } else if (assessment.employeeId) {
        const targetEmp = employees.find(e => e.id === assessment.employeeId);
        if (targetEmp && targetEmp.managerId === evaluatorEmployeeId) {
          determinedType = 'Manager';
        } else if (evaluatorEmp && targetEmp && evaluatorEmp.managerId === targetEmp.id) {
          determinedType = 'Subordinate';
        } else if (evaluatorEmp && targetEmp && evaluatorEmp.department === targetEmp.department) {
          determinedType = 'Peer';
        }
      }
    }

    for (const scoreEntry of scoresList) {
      const metadata = metadataList.find(m => m.id === scoreEntry.competencyId);
      if (!metadata) continue;
      
      const existingIdx = allScores.findIndex(
        s => s.assessmentId === id &&
             s.competencyId === scoreEntry.competencyId &&
             s.evaluatorEmployeeId === evaluatorEmployeeId
      );

      if (existingIdx !== -1) {
        allScores[existingIdx].score = scoreEntry.score;
        allScores[existingIdx].evaluatorType = determinedType;
        addedOrUpdated.push(allScores[existingIdx]);
      } else {
        const newId = allScores.length > 0 ? Math.max(...allScores.map(s => s.id)) + 1 : 1;
        const newScore: AssessmentScore = {
          id: newId,
          assessmentId: id,
          competencyId: scoreEntry.competencyId,
          competencyCode: metadata.code,
          competencyName: metadata.name,
          evaluatorEmployeeId,
          evaluatorType: determinedType,
          score: scoreEntry.score
        };
        allScores.push(newScore);
        addedOrUpdated.push(newScore);
      }
    }

    mockDb.setScores(allScores);

    // Update assignment status to completed
    const assignments = mockDb.getAssignments();
    const assignIdx = assignments.findIndex(
      a => a.assessmentId === id && a.evaluatorEmployeeId === evaluatorEmployeeId
    );
    if (assignIdx !== -1) {
      assignments[assignIdx].isCompleted = true;
      assignments[assignIdx].completedAt = new Date().toISOString();
      mockDb.setAssignments(assignments);
    }

    // Automatically complete the assessment if all assignments for it are now completed
    const assessmentAssignments = assignments.filter(a => a.assessmentId === id);
    const allCompleted = assessmentAssignments.every(a => a.isCompleted);
    if (allCompleted && assessmentAssignments.length > 0) {
      // Trigger complete
      const assessments = mockDb.getAssessments();
      const assIdx = assessments.findIndex(a => a.id === id);
      if (assIdx !== -1) {
        const finalScores = allScores.filter(s => s.assessmentId === id);
        const metadata = mockDb.getCompetencyMetadata();
        let compSum = 0;
        for (const comp of metadata) {
          const compScores = finalScores.filter(s => s.competencyId === comp.id);
          const compAvg = compScores.length > 0 ? compScores.reduce((sum, s) => sum + s.score, 0) / compScores.length : 3.0;
          compSum += compAvg;
        }
        const avg = compSum / metadata.length;
        assessments[assIdx].status = 'Completed';
        assessments[assIdx].overallScore = parseFloat(avg.toFixed(2));
        assessments[assIdx].updatedAt = new Date().toISOString();
        mockDb.setAssessments(assessments);
      }
    }

    return { success: true, message: 'Skorlar toplu kaydedildi.', data: addedOrUpdated };
  },

  addAssignment: async (
    assessmentId: number,
    evaluatorEmployeeId: number,
    evaluatorType: EvaluatorType
  ): Promise<ApiResponse<AssessmentAssignment>> => {
    await delay(200);
    const assignments = mockDb.getAssignments();
    const employees = mockDb.getEmployees();
    const evaluator = employees.find(e => e.id === evaluatorEmployeeId);
    if (!evaluator) {
      return { success: false, message: 'Çalışan bulunamadı.', data: null as any };
    }

    // Check if duplicate assignment exists
    const exists = assignments.some(a => a.assessmentId === assessmentId && a.evaluatorEmployeeId === evaluatorEmployeeId);
    if (exists) {
      return { success: false, message: 'Bu çalışan zaten bu değerlendirme için atanmış.', data: null as any };
    }

    const newId = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
    const newAssignment: AssessmentAssignment = {
      id: newId,
      assessmentId,
      evaluatorEmployeeId,
      evaluatorEmployeeName: evaluator.fullName,
      evaluatorType,
      isCompleted: false,
      completedAt: null
    };

    assignments.push(newAssignment);
    mockDb.setAssignments(assignments);

    return { success: true, message: 'Değerlendirici atandı.', data: newAssignment };
  },

  listAssignments: async (assessmentId: number): Promise<ApiResponse<AssessmentAssignment[]>> => {
    await delay(150);
    const assignments = mockDb.getAssignments().filter(a => a.assessmentId === assessmentId);
    return { success: true, message: null, data: assignments };
  },

  getMySurveys: async (): Promise<ApiResponse<MySurvey[]>> => {
    await delay(200);
    if (!currentSession || currentSession.employeeId === null) {
      return { success: false, message: 'Çalışan kaydı bulunamadı.', data: [] };
    }

    const empId = currentSession.employeeId;
    const assignments = mockDb.getAssignments().filter(a => a.evaluatorEmployeeId === empId && !a.isCompleted);
    const assessments = mockDb.getAssessments();

    const surveys: MySurvey[] = [];
    for (const assign of assignments) {
      const assessment = assessments.find(a => a.id === assign.assessmentId);
      if (assessment && assessment.status === 'Draft') {
        surveys.push({
          assignmentId: assign.id,
          assessmentId: assign.assessmentId,
          employeeId: assessment.employeeId,
          employeeName: assessment.employeeName,
          evaluatorEmployeeId: assign.evaluatorEmployeeId,
          cycleId: assessment.cycleId,
          cycleName: assessment.cycleName,
          evaluatorType: assign.evaluatorType,
          competencyCount: 13
        });
      }
    }

    return { success: true, message: null, data: surveys };
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

    // Check if there is an active incomplete plan
    const activePlan = mockDb.getActionPlans().find(
      (p) => p.employeeId === employee.id && p.status !== 'Completed' && p.status !== 'Cancelled'
    );
    if (activePlan) {
      return {
        success: false,
        message: 'Çalışanın devam eden tamamlanmamış bir gelişim planı bulunmaktadır. Yeni bir plan oluşturulamaz.',
        data: null
      };
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
        const deptDisplayLabels = (competencyMapping as any).dept_comp_display_labels[employee.department];
        const mappedName = deptDisplayLabels?.[act.target_competency] || (competencyMapping.dept_comp_labels as any)[employee.department]?.[act.target_competency] || '';
        const deptContent = act.content_by_department[employee.department];
        if (deptContent) {
          title = `${deptContent.title}`;
          description = `Çalışanın ${employee.department} departmanı bünyesindeki ${mappedName} alanını güçlendirmek için ${deptContent.delivery_type.toLowerCase()} görevidir. Kaynak: ${deptContent.resource}`;
        }
      }

      // Role overrides content
      if (act.action_category === 'Role' && act.content_by_role) {
        const roleDisplayLabels = (competencyMapping as any).role_comp_display_labels[employee.jobRole];
        const mappedName = roleDisplayLabels?.[act.target_competency] || (competencyMapping.role_comp_labels as any)[employee.jobRole]?.[act.target_competency] || '';
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

    // Enrich items with task status
    const tasks = mockDb.getTasks();
    const enrichedItems = plan.items.map((item) => {
      const task = tasks.find((t) => t.actionPlanItemId === item.id && t.employeeId === plan.employeeId);
      return {
        ...item,
        taskStatus: task ? task.status : undefined
      };
    });

    return { success: true, message: null, data: { ...plan, items: enrichedItems } };
  },

  getEmployeeActionPlans: async (employeeId: number): Promise<ApiResponse<ActionPlan[]>> => {
    await delay(200);
    const plans = mockDb.getActionPlans().filter((p) => p.employeeId === employeeId);
    const tasks = mockDb.getTasks();
    const enrichedPlans = plans.map((plan) => {
      const enrichedItems = plan.items.map((item) => {
        const task = tasks.find((t) => t.actionPlanItemId === item.id && t.employeeId === plan.employeeId);
        return {
          ...item,
          taskStatus: task ? task.status : undefined
        };
      });
      return { ...plan, items: enrichedItems };
    });
    return { success: true, message: null, data: enrichedPlans };
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
          actionPlanId: plan.id,
          title: item.title,
          description: item.description,
          resource: item.resource,
          deliveryType: item.deliveryType,
          priority: item.priority,
          employeeId: plan.employeeId,
          employeeName: plan.employeeName,
          assignedByUserId: plan.createdByUserId,
          assignedByUserName: plan.createdByUserName,
          status: 'Pending',
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

  cancelActionPlan: async (id: number): Promise<ApiResponse<ActionPlan>> => {
    await delay(300);
    const plans = mockDb.getActionPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) {
      return { success: false, message: 'Aksiyon planı bulunamadı.', data: null as any };
    }

    plans[idx].status = 'Cancelled';
    plans[idx].updatedAt = new Date().toISOString();
    mockDb.setActionPlans(plans);

    // Update corresponding assessment status
    const assessments = mockDb.getAssessments();
    const assIdx = assessments.findIndex((a) => a.id === plans[idx].assessmentId);
    if (assIdx !== -1) {
      assessments[assIdx].status = 'Analyzed';
      mockDb.setAssessments(assessments);
    }

    return { success: true, message: 'Aksiyon planı iptal edildi.', data: plans[idx] };
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
    // Pending -> InProgress -> Completed
    // Pending -> Cancelled
    // InProgress -> Cancelled
    let isValid = false;
    if (currentStatus === 'Pending' && (newStatus === 'InProgress' || newStatus === 'Cancelled')) {
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
    if (newStatus === 'Completed') {
      const planItem = tasks[idx].actionPlanItemId;
      const plans = mockDb.getActionPlans();
      let planUpdated = false;
      for (const plan of plans) {
        const item = plan.items.find(i => i.id === planItem);
        if (item) {
          // Find all tasks associated with this plan's items
          const planItemIds = plan.items.map(i => i.id);
          const planTasks = tasks.filter(t => t.employeeId === plan.employeeId && planItemIds.includes(t.actionPlanItemId));
          const allCompleted = planTasks.every(t => t.status === 'Completed');
          if (allCompleted) {
            plan.status = 'Completed';
            plan.updatedAt = new Date().toISOString();
            planUpdated = true;
          }
          break;
        }
      }
      if (planUpdated) {
        mockDb.setActionPlans(plans);
      }
    }
    
    return { success: true, message: 'Görev durumu güncellendi.', data: tasks[idx] };
  }
};
