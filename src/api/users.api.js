import { api } from './client';

export const usersApi = {
  list: () => api.get('/api/users'),
  directory: () => api.get('/api/users/directory'),
  create: (payload) => api.post('/api/users', payload),
  update: (id, payload) => api.patch(`/api/users/${id}`, payload),
  remove: (id) => api.delete(`/api/users/${id}`),
};
