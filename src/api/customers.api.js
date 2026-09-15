import { api } from './client';

export const customersApi = {
  list: () => api.get('/api/customers'),
  get: (id) => api.get(`/api/customers/${id}`),
  create: (payload) => api.post('/api/customers', payload),
  update: (id, payload) => api.patch(`/api/customers/${id}`, payload),
  remove: (id) => api.delete(`/api/customers/${id}`),
};
