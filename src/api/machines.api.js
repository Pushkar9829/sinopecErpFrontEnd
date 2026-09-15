import { api } from './client';

export const machinesApi = {
  list: () => api.get('/api/machines'),
  get: (id) => api.get(`/api/machines/${id}`),
  create: (payload) => api.post('/api/machines', payload),
  update: (id, payload) => api.patch(`/api/machines/${id}`, payload),
  remove: (id) => api.delete(`/api/machines/${id}`),
};
