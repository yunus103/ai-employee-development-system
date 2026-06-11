import {
  EmployeeDetail,
  Assessment,
  AssessmentScore,
  ActionPlan,
  EmployeeTask,
  AssessmentAssignment
} from '../types';
import demoUsers from '../data/demo_users.json';

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
const INITIAL_EMPLOYEES: EmployeeDetail[] = demoUsers as EmployeeDetail[];

// Initial Mock Assessments
const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 1,
    employeeId: 6,
    employeeName: 'Emre Koç',
    cycleId: 1,
    cycleName: '2024 Q4 Değerlendirmesi',
    overallScore: 3.48,
    status: 'Completed',
    createdByUserId: 5,
    createdByUserName: 'Zeynep Arslan',
    createdAt: '2026-05-15T09:00:00Z',
    updatedAt: '2026-05-16T11:00:00Z'
  },
  {
    id: 2,
    employeeId: 6,
    employeeName: 'Emre Koç',
    cycleId: 1,
    cycleName: '2024 Q4 Değerlendirmesi',
    overallScore: null,
    status: 'Draft',
    createdByUserId: 5,
    createdByUserName: 'Zeynep Arslan',
    createdAt: '2026-06-08T09:00:00Z',
    updatedAt: null
  }
];

// Initial Mock Assignments
const INITIAL_ASSIGNMENTS: AssessmentAssignment[] = [
  {
    id: 1,
    assessmentId: 1,
    evaluatorEmployeeId: 6,
    evaluatorEmployeeName: 'Emre Koç',
    evaluatorType: 'Self',
    isCompleted: true,
    completedAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 2,
    assessmentId: 1,
    evaluatorEmployeeId: 5,
    evaluatorEmployeeName: 'Zeynep Arslan',
    evaluatorType: 'Manager',
    isCompleted: true,
    completedAt: '2026-05-16T11:00:00Z'
  },
  {
    id: 3,
    assessmentId: 2,
    evaluatorEmployeeId: 6,
    evaluatorEmployeeName: 'Emre Koç',
    evaluatorType: 'Self',
    isCompleted: false,
    completedAt: null
  },
  {
    id: 4,
    assessmentId: 2,
    evaluatorEmployeeId: 5,
    evaluatorEmployeeName: 'Zeynep Arslan',
    evaluatorType: 'Manager',
    isCompleted: false,
    completedAt: null
  },
  {
    id: 5,
    assessmentId: 2,
    evaluatorEmployeeId: 7,
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

// Initial Assessment Scores for Emre Koç (Assessment ID=1)
const INITIAL_SCORES: AssessmentScore[] = [
  { id: 1, assessmentId: 1, competencyId: 1, competencyCode: 'Core_Communication', competencyName: 'İletişim', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.2 },
  { id: 2, assessmentId: 1, competencyId: 2, competencyCode: 'Core_Teamwork', competencyName: 'Takım Çalışması', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.8 },
  { id: 3, assessmentId: 1, competencyId: 3, competencyCode: 'Core_ProblemSolving', competencyName: 'Problem Çözme', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.5 },
  { id: 4, assessmentId: 1, competencyId: 4, competencyCode: 'Core_Adaptability', competencyName: 'Esneklik ve Uyum', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.2 },
  { id: 5, assessmentId: 1, competencyId: 5, competencyCode: 'Core_TimeManagement', competencyName: 'Zaman Yönetimi', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.0 },
  { id: 6, assessmentId: 1, competencyId: 6, competencyCode: 'Core_Initiative', competencyName: 'İnisiyatif Alma', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.4 },
  { id: 7, assessmentId: 1, competencyId: 7, competencyCode: 'Core_Accountability', competencyName: 'Sorumluluk Sahipliği', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.6 }, // Note: stroke isn't in type, clean this up
  { id: 8, assessmentId: 1, competencyId: 8, competencyCode: 'Core_LearningAgility', competencyName: 'Öğrenme Çevikliği', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.8 },
  { id: 9, assessmentId: 1, competencyId: 9, competencyCode: 'Dept_Comp1', competencyName: 'Tech_CodingQuality', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.7 },
  { id: 10, assessmentId: 1, competencyId: 10, competencyCode: 'Dept_Comp2', competencyName: 'Tech_SystemDesign', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.1 },
  { id: 11, assessmentId: 1, competencyId: 11, competencyCode: 'Dept_Comp3', competencyName: 'Tech_TestingAndQA', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.5 },
  { id: 12, assessmentId: 1, competencyId: 12, competencyCode: 'Role_Comp1', competencyName: 'Tech_DebuggingDepth', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.8 },
  { id: 13, assessmentId: 1, competencyId: 13, competencyCode: 'Role_Comp2', competencyName: 'Tech_ProblemDecomposition', evaluatorEmployeeId: 5, evaluatorType: 'Manager', score: 3.6 }
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
