import api from '../../services/api';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const getApiError = (error, fallback) =>
  error.response?.data?.message || error.response?.data?.error || fallback;
