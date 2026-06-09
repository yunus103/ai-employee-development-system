import {
  EmployeeDetail,
  Assessment,
  AssessmentScore,
  ActionPlan,
  EmployeeTask,
  AssessmentAssignment
} from '../types';

// Helper to get/set localStorage safely
const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Initial Mock Employees
const INITIAL_EMPLOYEES: EmployeeDetail[] = [
  {
    id: 1,
    employeeCode: 'EMP001',
    fullName: 'Ayşe Kaya',
    email: 'employee@demo.com',
    department: 'Sales & Marketing',
    jobRole: 'Sales Executive',
    managerId: 2,
    isActive: true,
    age: 32,
    gender: 'Female',
    departmentId: 3,
    jobRoleId: 13,
    managerName: 'Mehmet Yılmaz',
    education: '3',
    educationField: 'Life Sciences',
    businessTravel: 'Travel_Rarely',
    maritalStatus: 'Single',
    distanceFromHome: 5,
    environmentSatisfaction: 3,
    jobSatisfaction: 4,
    workLifeBalance: 3,
    totalWorkingYears: 8,
    yearsAtCompany: 5,
    yearsInCurrentRole: 3,
    yearsWithCurrManager: 2,
    performanceScore: 3.5,
    attrition: 'No'
  },
  {
    id: 2,
    employeeCode: 'EMP002',
    fullName: 'Mehmet Yılmaz',
    email: 'manager@demo.com',
    department: 'Sales & Marketing',
    jobRole: 'Sales Executive', // He is manager in users, but let's give him a manager name
    managerId: null,
    isActive: true,
    age: 41,
    gender: 'Male',
    departmentId: 3,
    jobRoleId: 15, // Let's pretend this is manager
    managerName: null,
    education: '4',
    educationField: 'Medical',
    businessTravel: 'Travel_Rarely',
    maritalStatus: 'Married',
    distanceFromHome: 12,
    environmentSatisfaction: 4,
    jobSatisfaction: 3,
    workLifeBalance: 3,
    totalWorkingYears: 18,
    yearsAtCompany: 10,
    yearsInCurrentRole: 5,
    yearsWithCurrManager: 0,
    performanceScore: 4.0,
    attrition: 'No'
  },
  {
    id: 3,
    employeeCode: 'EMP003',
    fullName: 'Can Özkan',
    email: 'can.ozkan@demo.com',
    department: 'Technology',
    jobRole: 'Software Engineer',
    managerId: 2,
    isActive: true,
    age: 26,
    gender: 'Male',
    departmentId: 2,
    jobRoleId: 4,
    managerName: 'Mehmet Yılmaz',
    education: '3',
    educationField: 'Computer Science',
    businessTravel: 'Non-Travel',
    maritalStatus: 'Single',
    distanceFromHome: 2,
    environmentSatisfaction: 4,
    jobSatisfaction: 2,
    workLifeBalance: 1, // Burnout candidate
    totalWorkingYears: 4,
    yearsAtCompany: 2,
    yearsInCurrentRole: 2,
    yearsWithCurrManager: 2,
    performanceScore: 3.8,
    attrition: 'No'
  },
  {
    id: 4,
    employeeCode: 'EMP004',
    fullName: 'Elif Şen',
    email: 'elif.sen@demo.com',
    department: 'Human Resources',
    jobRole: 'Recruiter',
    managerId: null,
    isActive: true,
    age: 29,
    gender: 'Female',
    departmentId: 1,
    jobRoleId: 2,
    managerName: null,
    education: '4',
    educationField: 'Human Resources',
    businessTravel: 'Travel_Rarely',
    maritalStatus: 'Married',
    distanceFromHome: 15,
    environmentSatisfaction: 3,
    jobSatisfaction: 4,
    workLifeBalance: 4,
    totalWorkingYears: 6,
    yearsAtCompany: 3,
    yearsInCurrentRole: 2,
    yearsWithCurrManager: 0,
    performanceScore: 3.9,
    attrition: 'No'
  }
];

// Initial Mock Assessments
const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Ayşe Kaya',
    cycleId: 1,
    cycleName: '2024 Q4 Değerlendirmesi',
    overallScore: 3.34,
    status: 'Completed',
    createdByUserId: 2,
    createdByUserName: 'HR User',
    createdAt: '2026-05-15T09:00:00Z',
    updatedAt: '2026-05-16T11:00:00Z'
  },
  {
    id: 2,
    employeeId: 1,
    employeeName: 'Ayşe Kaya',
    cycleId: 1,
    cycleName: '2024 Q4 Değerlendirmesi',
    overallScore: null,
    status: 'Draft',
    createdByUserId: 2,
    createdByUserName: 'HR User',
    createdAt: '2026-06-08T09:00:00Z',
    updatedAt: null
  }
];

// Initial Mock Assignments
const INITIAL_ASSIGNMENTS: AssessmentAssignment[] = [
  {
    id: 1,
    assessmentId: 1,
    evaluatorEmployeeId: 1,
    evaluatorEmployeeName: 'Ayşe Kaya',
    evaluatorType: 'Self',
    isCompleted: true,
    completedAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 2,
    assessmentId: 1,
    evaluatorEmployeeId: 2,
    evaluatorEmployeeName: 'Mehmet Yılmaz',
    evaluatorType: 'Manager',
    isCompleted: true,
    completedAt: '2026-05-16T11:00:00Z'
  },
  {
    id: 3,
    assessmentId: 2,
    evaluatorEmployeeId: 1,
    evaluatorEmployeeName: 'Ayşe Kaya',
    evaluatorType: 'Self',
    isCompleted: false,
    completedAt: null
  },
  {
    id: 4,
    assessmentId: 2,
    evaluatorEmployeeId: 2,
    evaluatorEmployeeName: 'Mehmet Yılmaz',
    evaluatorType: 'Manager',
    isCompleted: false,
    completedAt: null
  },
  {
    id: 5,
    assessmentId: 2,
    evaluatorEmployeeId: 4,
    evaluatorEmployeeName: 'Elif Şen',
    evaluatorType: 'Peer',
    isCompleted: false,
    completedAt: null
  }
];

// Competency metadata IDs
const COMPETENCY_METADATA = [
  { id: 1, code: 'Core_Communication', name: 'İletişim' },
  { id: 2, code: 'Core_Teamwork', name: 'Takım Çalışması' },
  { id: 3, code: 'Core_ProblemSolving', name: 'Problem Çözme' },
  { id: 4, code: 'Core_Adaptability', name: 'Esneklik ve Uyum' },
  { id: 5, code: 'Core_TimeManagement', name: 'Zaman Yönetimi' },
  { id: 6, code: 'Core_Initiative', name: 'İnisiyatif Alma' },
  { id: 7, code: 'Core_Accountability', name: 'Sorumluluk Sahipliği' },
  { id: 8, code: 'Core_LearningAgility', name: 'Öğrenme Çevikliği' },
  { id: 9, code: 'Dept_Comp1', name: 'Departman Yetkinliği 1' },
  { id: 10, code: 'Dept_Comp2', name: 'Departman Yetkinliği 2' },
  { id: 11, code: 'Dept_Comp3', name: 'Departman Yetkinliği 3' },
  { id: 12, code: 'Role_Comp1', name: 'Rol Yetkinliği 1' },
  { id: 13, code: 'Role_Comp2', name: 'Rol Yetkinliği 2' }
];

// Initial Assessment Scores for Ayşe Kaya (Assessment ID=1)
const INITIAL_SCORES: AssessmentScore[] = [
  { id: 1, assessmentId: 1, competencyId: 1, competencyCode: 'Core_Communication', competencyName: 'İletişim', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.2 },
  { id: 2, assessmentId: 1, competencyId: 2, competencyCode: 'Core_Teamwork', competencyName: 'Takım Çalışması', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.7 },
  { id: 3, assessmentId: 1, competencyId: 3, competencyCode: 'Core_ProblemSolving', competencyName: 'Problem Çözme', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.5 },
  { id: 4, assessmentId: 1, competencyId: 4, competencyCode: 'Core_Adaptability', competencyName: 'Esneklik ve Uyum', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.1 },
  { id: 5, assessmentId: 1, competencyId: 5, competencyCode: 'Core_TimeManagement', competencyName: 'Zaman Yönetimi', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 2.9 },
  { id: 6, assessmentId: 1, competencyId: 6, competencyCode: 'Core_Initiative', competencyName: 'İnisiyatif Alma', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.0 },
  { id: 7, assessmentId: 1, competencyId: 7, competencyCode: 'Core_Accountability', competencyName: 'Sorumluluk Sahipliği', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.8 },
  { id: 8, assessmentId: 1, competencyId: 8, competencyCode: 'Core_LearningAgility', competencyName: 'Öğrenme Çevikliği', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.4 },
  { id: 9, assessmentId: 1, competencyId: 9, competencyCode: 'Dept_Comp1', competencyName: 'Sales_SalesSkill', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.5 },
  { id: 10, assessmentId: 1, competencyId: 10, competencyCode: 'Dept_Comp2', competencyName: 'Sales_Negotiation', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.0 },
  { id: 11, assessmentId: 1, competencyId: 11, competencyCode: 'Dept_Comp3', competencyName: 'Sales_CustomerRelationship', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.6 },
  { id: 12, assessmentId: 1, competencyId: 12, competencyCode: 'Role_Comp1', competencyName: 'Sales_ClosingDeals', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.4 },
  { id: 13, assessmentId: 1, competencyId: 13, competencyCode: 'Role_Comp2', competencyName: 'Sales_PipelineManagement', evaluatorEmployeeId: 2, evaluatorType: 'Manager', score: 3.1 }
];

export const initializeMockDatabase = () => {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem('mock_employees')) {
    setLocalStorage('mock_employees', INITIAL_EMPLOYEES);
  }
  if (!localStorage.getItem('mock_assessments')) {
    setLocalStorage('mock_assessments', INITIAL_ASSESSMENTS);
  }
  if (!localStorage.getItem('mock_assignments')) {
    setLocalStorage('mock_assignments', INITIAL_ASSIGNMENTS);
  }
  if (!localStorage.getItem('mock_scores')) {
    setLocalStorage('mock_scores', INITIAL_SCORES);
  }
  if (!localStorage.getItem('mock_action_plans')) {
    setLocalStorage('mock_action_plans', [] as ActionPlan[]);
  }
  if (!localStorage.getItem('mock_tasks')) {
    setLocalStorage('mock_tasks', [] as EmployeeTask[]);
  }
};

// Database Getters & Setters
export const mockDb = {
  getEmployees: () => getLocalStorage<EmployeeDetail[]>('mock_employees', INITIAL_EMPLOYEES),
  setEmployees: (val: EmployeeDetail[]) => setLocalStorage('mock_employees', val),
  
  getAssessments: () => getLocalStorage<Assessment[]>('mock_assessments', INITIAL_ASSESSMENTS),
  setAssessments: (val: Assessment[]) => setLocalStorage('mock_assessments', val),

  getAssignments: () => getLocalStorage<AssessmentAssignment[]>('mock_assignments', INITIAL_ASSIGNMENTS),
  setAssignments: (val: AssessmentAssignment[]) => setLocalStorage('mock_assignments', val),
  
  getScores: () => getLocalStorage<AssessmentScore[]>('mock_scores', INITIAL_SCORES),
  setScores: (val: AssessmentScore[]) => setLocalStorage('mock_scores', val),
  
  getActionPlans: () => getLocalStorage<ActionPlan[]>('mock_action_plans', []),
  setActionPlans: (val: ActionPlan[]) => setLocalStorage('mock_action_plans', val),
  
  getTasks: () => getLocalStorage<EmployeeTask[]>('mock_tasks', []),
  setTasks: (val: EmployeeTask[]) => setLocalStorage('mock_tasks', val),
  
  getCompetencyMetadata: () => COMPETENCY_METADATA
};
