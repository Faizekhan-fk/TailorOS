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
  const token = config.url?.includes('/customer-portal/me')
    ? localStorage.getItem('portalAccessToken')
    : localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeShopId = localStorage.getItem('activeShopId');
  if (activeShopId) {
    config.headers['X-Shop-Id'] = activeShopId;
  }
  return config;
});

// Handle token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest?.url?.includes('/auth/');
    const isPortalRequest = originalRequest?.url?.includes('/customer-portal/me');

    if (error.response?.status === 401 && isPortalRequest) {
      localStorage.removeItem('portalAccessToken');
      if (window.location.pathname.startsWith('/portal') && window.location.pathname !== '/portal/login') {
        window.location.href = '/portal/login';
      }
      return Promise.reject(error);
    }
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
    api.get('/customers', {
      params: typeof page === 'object' ? page : { page, limit, search },
    }),
  create: (data) => api.post('/customers', data),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.patch(`/customers/${id}`, data),
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

export const shopsAPI = {
  list: () => api.get('/shops'),
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
    api.get('/orders', {
      params: typeof page === 'object' ? page : { page, limit, search },
    }),
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.put(`/orders/${id}`, data),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  delete: (id) => api.delete(`/orders/${id}`),
};

export const paymentsAPI = {
  list: (params = {}) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.patch(`/payments/${id}`, data),
  refund: (id, data) => api.post(`/payments/${id}/refunds`, data),
  void: (id) => api.delete(`/payments/${id}`),
};

export const productionAPI = {
  list: (params = {}) => api.get('/production', { params }),
  getById: (id) => api.get(`/production/${id}`),
  createOrderJobs: (orderId) => api.post(`/production/orders/${orderId}/jobs`),
  updateStage: (id, data) => api.patch(`/production/${id}/stage`, data),
  assign: (id, tailorId) => api.patch(`/production/${id}/assignment`, { tailorId }),
};

export const purchasesAPI = {
  list: (params = {}) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  receive: (id) => api.post(`/purchases/${id}/receive`),
  cancel: (id) => api.delete(`/purchases/${id}`),
};

export const expensesAPI = {
  list: (params = {}) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.patch(`/expenses/${id}`, data),
  void: (id) => api.delete(`/expenses/${id}`),
};

export const invoicesAPI = {
  list: (params = {}) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  void: (id) => api.delete(`/invoices/${id}`),
};

export const notificationsAPI = {
  list: (params = {}) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  announce: (data) => api.post('/notifications', data),
};

export const reportsAPI = {
  financial: (params = {}) => api.get('/reports/financial', { params }),
  production: () => api.get('/reports/production'),
};

export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
};

export const auditLogsAPI = {
  list: (params = {}) => api.get('/audit-logs', { params }),
};

export const customerPortalAPI = {
  login: (data) => api.post('/customer-portal/auth/login', data),
  accounts: () => api.get('/customer-portal/accounts'),
  createAccount: (data) => api.post('/customer-portal/accounts', data),
  updateAccount: (id, data) => api.patch(`/customer-portal/accounts/${id}`, data),
  profile: () => api.get('/customer-portal/me'),
  orders: () => api.get('/customer-portal/me/orders'),
  invoices: () => api.get('/customer-portal/me/invoices'),
  measurements: () => api.get('/customer-portal/me/measurements'),
};

export const whatsappAPI = {
  status: () => api.get('/whatsapp/status'),
  messages: (params = {}) => api.get('/whatsapp/messages', { params }),
  consent: (customerId, data) => api.post(`/whatsapp/customers/${customerId}/consent`, data),
  send: (data) => api.post('/whatsapp/messages', data),
};

export const barcodesAPI = {
  generate: (type, id, format = 'qr') => api.get(`/barcodes/${type}/${id}`, { params: { format }, responseType: 'text' }),
  resolve: (code) => api.post('/barcodes/resolve', { code }),
};

// Inventory endpoints
export const inventoryAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/inventory', { params: typeof page === 'object' ? page : { page, limit, search } }),
  create: (data) => api.post('/inventory', data),
  getById: (id) => api.get(`/inventory/${id}`),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  updateStock: (id, quantity) => api.patch(`/inventory/${id}/stock`, { quantity }),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// Suppliers endpoints
export const suppliersAPI = {
  list: (page = 1, limit = 10, search) =>
    api.get('/suppliers', { params: typeof page === 'object' ? page : { page, limit, search } }),
  create: (data) => api.post('/suppliers', data),
  getById: (id) => api.get(`/suppliers/${id}`),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Tailors endpoints
export const tailorsAPI = {
  list: (page = 1, limit = 10, available) =>
    api.get('/tailors', {
      params: typeof page === 'object' ? page : { page, limit, available },
    }),
  create: (data) => api.post('/tailors', data),
  getById: (id) => api.get(`/tailors/${id}`),
  update: (id, data) => api.put(`/tailors/${id}`, data),
  delete: (id) => api.delete(`/tailors/${id}`),
};

export default api;
