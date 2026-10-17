import { api } from './client';

export const suppliersApi = {
  list: (activeOnly = false) => api.get(`/api/suppliers${activeOnly ? '?active=1' : ''}`),
  get: (id) => api.get(`/api/suppliers/${id}`),
  create: (payload) => api.post('/api/suppliers', payload),
  update: (id, payload) => api.patch(`/api/suppliers/${id}`, payload),
  remove: (id) => api.delete(`/api/suppliers/${id}`),
};
