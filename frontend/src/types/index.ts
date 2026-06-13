export type UserRole = 'Admin' | 'HR' | 'Manager' | 'Employee';

export interface UserSession {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  employeeId: number | null;
  isActive: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  employeeId: number | null;
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  jobRole: string;
  managerId: number | null;
  isActive: boolean;
}

export interface EmployeeDetail extends Employee {
  age: number;
  gender: 'Male' | 'Female';
  departmentId: number;
  jobRoleId: number;
  managerName: string | null;
  education: string;
  educationField: string;
  businessTravel: string;
  maritalStatus: string;
  distanceFromHome: number;
  environmentSatisfaction: number;
  jobSatisfaction: number;
  workLifeBalance: number;
  totalWorkingYears: number;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsWithCurrManager: number;
  performanceScore: number;
  attrition: 'Yes' | 'No';
}

export interface EmployeeFeatures {
  age: number;
  attrition: 'Yes' | 'No';
  businessTravel: string;
  department: string;
  distanceFromHome: number;
  education: string;
  educationField: string;
  environmentSatisfaction: number;
  gender: 'Male' | 'Female';
  jobRole: string;
  jobSatisfaction: number;
  maritalStatus: string;
  workLifeBalance: number;
  totalWorkingYears: number;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsWithCurrManager: number;
  performanceScore: number;
  core_Communication: number;
  core_Teamwork: number;
  core_ProblemSolving: number;
  core_Adaptability: number;
  core_Initiative: number;
  core_Accountability: number;
  core_LearningAgility: number;
  core_TimeManagement: number;
  dept_Comp1: number;
  dept_Comp2: number;
  dept_Comp3: number;
  role_Comp1: number;
  role_Comp2: number;
}

export type AssessmentStatus =
  | 'Draft'
  | 'Completed'
  | 'Analyzed'
  | 'ActionPlanGenerated'
  | 'Approved'
  | 'SentToEmployee';

export interface Assessment {
  id: number;
  employeeId: number;
  employeeName: string;
  cycleId: number;
  cycleName: string;
  overallScore: number | null;
  status: AssessmentStatus;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string | null;
}

export type EvaluatorType = 'Self' | 'Manager' | 'Peer' | 'Subordinate';

export interface AssessmentScore {
  id: number;
  assessmentId: number;
  competencyId: number;
  competencyCode: string;
  competencyName: string;
  evaluatorEmployeeId: number;
  evaluatorType: EvaluatorType;
  score: number;
}

export interface AssessmentAssignment {
  id: number;
  assessmentId: number;
  evaluatorEmployeeId: number;
  evaluatorEmployeeName: string;
  evaluatorType: EvaluatorType;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface MySurvey {
  assignmentId: number;
  assessmentId: number;
  employeeId: number;
  employeeName: string;
  cycleId: number;
  cycleName: string;
  evaluatorType: EvaluatorType;
  competencyCount: number;
}

export type ActionPlanStatus =
  | 'Draft'
  | 'Edited'
  | 'Approved'
  | 'Sent'
  | 'Completed'
  | 'Cancelled';

export type ActionPriority = 'Low' | 'Medium' | 'High';

export interface ActionPlanItem {
  id: number;
  actionPlanId: number;
  actionCatalogId: number | null;
  aiPredictedActionId: number | null;
  title: string;
  description: string;
  resource?: string | null;
  deliveryType?: string | null;
  priority: ActionPriority;
  dueDate: string | null;
  source: 'AI' | 'Manual';
  orderNo: number;
  taskStatus?: string;
}

export interface ActionPlan {
  id: number;
  assessmentId: number;
  employeeId: number;
  employeeName: string;
  createdByUserId: number;
  createdByUserName: string;
  status: ActionPlanStatus;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  items: ActionPlanItem[];
}

export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';

export interface EmployeeTask {
  id: number;
  actionPlanItemId: number;
  actionPlanId?: number;
  title: string;
  description: string;
  resource?: string | null;
  deliveryType?: string | null;
  priority: ActionPriority;
  employeeId: number;
  employeeName: string;
  assignedByUserId: number;
  assignedByUserName: string;
  status: TaskStatus;
  assignedAt: string;
  dueDate: string | null;
  completedAt: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export interface PagedResponse<T> {
  success: boolean;
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
