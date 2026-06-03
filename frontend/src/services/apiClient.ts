import axios from 'axios';
import { mockApi } from './mockApi';
import { initializeMockDatabase } from './mockData';
import {
  LoginResponse,
  UserSession,
  EmployeeDetail,
  Assessment,
  AssessmentScore,
  ActionPlan,
  ActionPlanItem,
  EmployeeTask,
  EvaluatorType,
  ActionPriority,
  TaskStatus,
  ApiResponse,
  PagedResponse
} from '../types';

// Initialize mock DB data in client-side localStorage
if (typeof window !== 'undefined') {
  initializeMockDatabase();
}

// Config
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'; // Defaults to true unless explicitly 'false'

// Axios Instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject Token
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle Token Refresh (401 rotation)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        // Redirect to login if no refresh token
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        isRefreshing = false;
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Export Client API wrapper
export const apiClient = {
  isMock: USE_MOCK,

  auth: {
    login: async (email: string, password?: string): Promise<ApiResponse<LoginResponse>> => {
      if (USE_MOCK) return mockApi.login(email, password);
      const res = await axiosInstance.post<ApiResponse<LoginResponse>>('/api/auth/login', { email, password });
      
      // Store tokens on success
      if (res.data.success && typeof window !== 'undefined') {
        localStorage.setItem('accessToken', res.data.data.accessToken);
        localStorage.setItem('refreshToken', res.data.data.refreshToken);
      }
      return res.data;
    },
    logout: async (): Promise<ApiResponse<{}>> => {
      if (USE_MOCK) return mockApi.logout();
      const refreshToken = localStorage.getItem('refreshToken');
      const res = await axiosInstance.post<ApiResponse<{}>>('/api/auth/logout', { refreshToken });
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      return res.data;
    },
    getMe: async (): Promise<ApiResponse<UserSession>> => {
      if (USE_MOCK) return mockApi.getMe();
      const res = await axiosInstance.get<ApiResponse<UserSession>>('/api/auth/me');
      return res.data;
    }
  },

  employees: {
    list: async (pageNumber: number = 1, pageSize: number = 20): Promise<PagedResponse<EmployeeDetail>> => {
      if (USE_MOCK) return mockApi.getEmployees(pageNumber, pageSize);
      const res = await axiosInstance.get<PagedResponse<EmployeeDetail>>('/api/employees', {
        params: { pageNumber, pageSize }
      });
      return res.data;
    },
    get: async (id: number): Promise<ApiResponse<EmployeeDetail>> => {
      if (USE_MOCK) return mockApi.getEmployeeById(id);
      const res = await axiosInstance.get<ApiResponse<EmployeeDetail>>(`/api/employees/${id}`);
      return res.data;
    },
    update: async (id: number, data: Partial<EmployeeDetail>): Promise<ApiResponse<EmployeeDetail>> => {
      if (USE_MOCK) return mockApi.updateEmployee(id, data);
      const res = await axiosInstance.put<ApiResponse<EmployeeDetail>>(`/api/employees/${id}`, data);
      return res.data;
    },
    getFeatures: async (id: number, assessmentId: number): Promise<ApiResponse<any>> => {
      if (USE_MOCK) return mockApi.getEmployeeFeatures(id, assessmentId);
      const res = await axiosInstance.get<ApiResponse<any>>(`/api/employees/${id}/features`, {
        params: { assessmentId }
      });
      return res.data;
    },
    getAssessments: async (
      employeeId: number,
      pageNumber: number = 1,
      pageSize: number = 20
    ): Promise<PagedResponse<Assessment>> => {
      if (USE_MOCK) return mockApi.getEmployeeAssessments(employeeId, pageNumber, pageSize);
      const res = await axiosInstance.get<PagedResponse<Assessment>>(`/api/employees/${employeeId}/assessments`, {
        params: { pageNumber, pageSize }
      });
      return res.data;
    },
    getActionPlans: async (employeeId: number): Promise<ApiResponse<ActionPlan[]>> => {
      if (USE_MOCK) return mockApi.getEmployeeActionPlans(employeeId);
      const res = await axiosInstance.get<ApiResponse<ActionPlan[]>>(`/api/employees/${employeeId}/action-plans`);
      return res.data;
    }
  },

  assessments: {
    create: async (employeeId: number, cycleId: number): Promise<ApiResponse<Assessment>> => {
      if (USE_MOCK) return mockApi.createAssessment(employeeId, cycleId);
      const res = await axiosInstance.post<ApiResponse<Assessment>>('/api/assessments', { employeeId, cycleId });
      return res.data;
    },
    get: async (id: number): Promise<ApiResponse<Assessment>> => {
      if (USE_MOCK) return mockApi.getAssessmentById(id);
      const res = await axiosInstance.get<ApiResponse<Assessment>>(`/api/assessments/${id}`);
      return res.data;
    },
    complete: async (id: number): Promise<ApiResponse<Assessment>> => {
      if (USE_MOCK) return mockApi.completeAssessment(id);
      const res = await axiosInstance.put<ApiResponse<Assessment>>(`/api/assessments/${id}/complete`);
      return res.data;
    },
    getScores: async (id: number): Promise<ApiResponse<AssessmentScore[]>> => {
      if (USE_MOCK) return mockApi.getAssessmentScores(id);
      const res = await axiosInstance.get<ApiResponse<AssessmentScore[]>>(`/api/assessments/${id}/scores`);
      return res.data;
    },
    upsertScore: async (
      assessmentId: number,
      competencyId: number,
      evaluatorType: EvaluatorType,
      score: number
    ): Promise<ApiResponse<AssessmentScore>> => {
      if (USE_MOCK) return mockApi.upsertAssessmentScore(assessmentId, competencyId, evaluatorType, score);
      const res = await axiosInstance.post<ApiResponse<AssessmentScore>>(`/api/assessments/${assessmentId}/scores`, {
        competencyId,
        evaluatorType,
        score
      });
      return res.data;
    }
  },

  actionPlans: {
    generate: async (assessmentId: number, topK: number = 13): Promise<ApiResponse<any>> => {
      if (USE_MOCK) return mockApi.generateActionPlan(assessmentId, topK);
      const res = await axiosInstance.post<ApiResponse<any>>('/api/action-plans/generate', { assessmentId, topK });
      return res.data;
    },
    get: async (id: number): Promise<ApiResponse<ActionPlan>> => {
      if (USE_MOCK) return mockApi.getActionPlanById(id);
      const res = await axiosInstance.get<ApiResponse<ActionPlan>>(`/api/action-plans/${id}`);
      return res.data;
    },
    updateItem: async (
      planId: number,
      itemId: number,
      data: { title: string; description: string; priority: ActionPriority; dueDate: string | null; orderNo: number }
    ): Promise<ApiResponse<ActionPlanItem>> => {
      if (USE_MOCK) return mockApi.updateActionPlanItem(planId, itemId, data);
      const res = await axiosInstance.put<ApiResponse<ActionPlanItem>>(`/api/action-plans/${planId}/items/${itemId}`, data);
      return res.data;
    },
    addItem: async (
      planId: number,
      data: { title: string; description: string; priority: ActionPriority; dueDate: string | null; actionCatalogId?: number | null }
    ): Promise<ApiResponse<ActionPlanItem>> => {
      if (USE_MOCK) return mockApi.addActionPlanItem(planId, data);
      const res = await axiosInstance.post<ApiResponse<ActionPlanItem>>(`/api/action-plans/${planId}/items`, data);
      return res.data;
    },
    deleteItem: async (planId: number, itemId: number): Promise<ApiResponse<{}>> => {
      if (USE_MOCK) return mockApi.deleteActionPlanItem(planId, itemId);
      const res = await axiosInstance.delete<ApiResponse<{}>>(`/api/action-plans/${planId}/items/${itemId}`);
      return res.data;
    },
    approve: async (id: number): Promise<ApiResponse<ActionPlan>> => {
      if (USE_MOCK) return mockApi.approveActionPlan(id);
      const res = await axiosInstance.post<ApiResponse<ActionPlan>>(`/api/action-plans/${id}/approve`);
      return res.data;
    },
    send: async (id: number): Promise<ApiResponse<ActionPlan>> => {
      if (USE_MOCK) return mockApi.sendActionPlan(id);
      const res = await axiosInstance.post<ApiResponse<ActionPlan>>(`/api/action-plans/${id}/send`);
      return res.data;
    },
    exportPdf: async (id: number): Promise<Blob> => {
      if (USE_MOCK) {
        // Return dummy PDF blob for mock
        await new Promise((resolve) => setTimeout(resolve, 500));
        return new Blob(['Mock PDF Binary Data'], { type: 'application/pdf' });
      }
      const res = await axiosInstance.get(`/api/action-plans/${id}/export-pdf`, {
        responseType: 'blob'
      });
      return res.data;
    }
  },

  tasks: {
    getMy: async (pageNumber: number = 1, pageSize: number = 20): Promise<PagedResponse<EmployeeTask>> => {
      if (USE_MOCK) return mockApi.getMyTasks(pageNumber, pageSize);
      const res = await axiosInstance.get<PagedResponse<EmployeeTask>>('/api/tasks/my', {
        params: { pageNumber, pageSize }
      });
      return res.data;
    },
    get: async (id: number): Promise<ApiResponse<EmployeeTask>> => {
      if (USE_MOCK) return mockApi.getTaskById(id);
      const res = await axiosInstance.get<ApiResponse<EmployeeTask>>(`/api/tasks/${id}`);
      return res.data;
    },
    updateStatus: async (id: number, newStatus: TaskStatus): Promise<ApiResponse<EmployeeTask>> => {
      if (USE_MOCK) return mockApi.updateTaskStatus(id, newStatus);
      const res = await axiosInstance.put<ApiResponse<EmployeeTask>>(`/api/tasks/${id}/status`, { newStatus });
      return res.data;
    }
  }
};
