import { create } from 'zustand';
import { apiClient } from '../services/apiClient';
import { UserSession } from '../types';

interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMockMode: boolean;
  
  // Actions
  login: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

export const useStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isMockMode: apiClient.isMock,

  login: async (email: string, password?: string) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.auth.login(email, password);
      if (res.success && res.data) {
        // Fetch full profile info via getMe
        const profileRes = await apiClient.auth.getMe();
        if (profileRes.success && profileRes.data) {
          set({
            user: profileRes.data,
            accessToken: res.data.accessToken,
            isAuthenticated: true,
            isLoading: false
          });
          return { success: true, message: 'Giriş başarılı' };
        }
      }
      set({ isLoading: false, isAuthenticated: false, user: null, accessToken: null });
      return { success: false, message: res.message || 'Giriş başarısız.' };
    } catch (err: unknown) {
      set({ isLoading: false, isAuthenticated: false, user: null, accessToken: null });
      const apiError = err as { response?: { data?: { message?: string } } };
      return { 
        success: false, 
        message: apiError.response?.data?.message || 'Giriş işlemi sırasında sunucu hatası oluştu.' 
      };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.auth.logout();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const isMock = apiClient.isMock;
    
    // Check if token exists
    const tokenKey = isMock ? 'mock_access_token' : 'accessToken';
    const token = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null;

    if (!token) {
      set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
      return false;
    }

    try {
      const res = await apiClient.auth.getMe();
      if (res.success && res.data) {
        set({
          user: res.data,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      }
      
      // Clear token if invalid profile response
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
      return false;
    } catch (err) {
      console.error('Auth verification failed', err);
      // Wait to see if refresh is successful, but for initial check, assume false
      set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
      return false;
    }
  },

  refreshUser: async () => {
    try {
      const res = await apiClient.auth.getMe();
      if (res.success && res.data) {
        set({ user: res.data });
      }
    } catch (err) {
      console.error('Failed to refresh user profile', err);
    }
  }
}));
