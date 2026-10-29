import { api } from './client';

export const documentLayoutsApi = {
  list: () => api.get('/api/document-layouts'),
  get: (id) => api.get(`/api/document-layouts/${id}`),
  save: (id, payload) => api.put(`/api/document-layouts/${id}`, payload),
  reset: (id) => api.delete(`/api/document-layouts/${id}`),
  orderFields: () => api.get('/api/document-layouts/order-fields'),
};
