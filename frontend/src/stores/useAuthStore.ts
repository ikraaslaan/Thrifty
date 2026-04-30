import { create } from 'zustand';
import axiosClient from '../api/axiosClient';

interface User {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  latitude?: number;
  longitude?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('thrifty_token') || null,
  isAuthenticated: !!localStorage.getItem('thrifty_token'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosClient.post('/auth/login', credentials);
      const { user, token } = response.data.data;
      
      localStorage.setItem('thrifty_token', token);
      
      set({ 
        user, 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Giriş yapılırken bir hata oluştu', 
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (userData) => {
    // Optimistic UI approach: immediately show loading state
    set({ isLoading: true, error: null });
    try {
      const response = await axiosClient.post('/auth/register', userData);
      const { user, token } = response.data.data;
      
      localStorage.setItem('thrifty_token', token);
      
      set({ 
        user, 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Kayıt sırasında bir hata oluştu', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('thrifty_token');
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
  },

  clearError: () => set({ error: null }),
}));
