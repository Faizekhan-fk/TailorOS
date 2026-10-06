import { create } from 'zustand';
import { authApi, getApiError } from './auth.api';

const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

const saveSession = (set, accessToken, user) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  set({ accessToken, user, isLoading: false, error: null });
};

export const useAuthStore = create((set) => ({
  user: storedUser,
  accessToken: localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login(credentials);
      saveSession(set, data.data.accessToken, data.data.user);
      return { success: true };
    } catch (error) {
      const message = getApiError(error, 'Unable to sign in');
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.register(input);
      saveSession(set, data.data.accessToken, data.data.user);
      return { success: true };
    } catch (error) {
      const message = getApiError(error, 'Unable to create account');
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      set({ user: null, accessToken: null, error: null });
    }
  },

  clearSession: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null });
  },
}));
