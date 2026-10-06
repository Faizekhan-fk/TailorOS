import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshPromise = null;

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRequest) {
      originalRequest._retry = true;
      refreshPromise ||= api.post('/auth/refresh', {}, { _skipAuthRefresh: true })
        .then(({ data }) => {
          const token = data.data.accessToken;
          localStorage.setItem('accessToken', token);
          return token;
        })
        .finally(() => {
          refreshPromise = null;
        });

      try {
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest?._skipAuthRefresh) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Customers endpoints
export const customersAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/customers', { params: { page, limit, search } }),
  create: (data) => api.post('/customers', data),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  updateMeasurements: (id, templateId, values, notes) => api.post(`/customers/${id}/measurements`, { templateId, values, notes }),
  measurementHistory: (id) => api.get(`/customers/${id}/measurements`),
  measurementProfile: (id, profileId) => api.get(`/customers/${id}/measurements/${profileId}`),
};

export const measurementTemplatesAPI = {
  list: () => api.get('/measurements/templates'),
  getById: (id) => api.get(`/measurements/templates/${id}`),
  create: (data) => api.post('/measurements/templates', data),
  update: (id, data) => api.patch(`/measurements/templates/${id}`, data),
  delete: (id) => api.delete(`/measurements/templates/${id}`),
};

// Garments endpoints
export const garmentsAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/garments', { params: { page, limit, search } }),
  create: (data) => api.post('/garments', data),
  getById: (id) => api.get(`/garments/${id}`),
  update: (id, data) => api.put(`/garments/${id}`, data),
  delete: (id) => api.delete(`/garments/${id}`),
};

// Orders endpoints
export const ordersAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/orders', { params: { page, limit, search } }),
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.put(`/orders/${id}`, data),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  delete: (id) => api.delete(`/orders/${id}`),
};

// Inventory endpoints
export const inventoryAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/inventory', { params: { page, limit, search } }),
  create: (data) => api.post('/inventory', data),
  getById: (id) => api.get(`/inventory/${id}`),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  updateStock: (id, quantity) => api.patch(`/inventory/${id}/stock`, { quantity }),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// Suppliers endpoints
export const suppliersAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/suppliers', { params: { page, limit, search } }),
  create: (data) => api.post('/suppliers', data),
  getById: (id) => api.get(`/suppliers/${id}`),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Tailors endpoints
export const tailorsAPI = {
  list: (page = 1, limit = 10, available) =>
    api.get('/tailors', { params: { page, limit, available } }),
  create: (data) => api.post('/tailors', data),
  getById: (id) => api.get(`/tailors/${id}`),
  update: (id, data) => api.put(`/tailors/${id}`, data),
  delete: (id) => api.delete(`/tailors/${id}`),
};

export default api;
