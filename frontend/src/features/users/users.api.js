import api from '../../services/api';

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  deactivate: (id) => api.delete(`/users/${id}`),
  roles: () => api.get('/users/roles'),
};
