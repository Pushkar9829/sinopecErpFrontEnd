import { api } from './client';

export const salesSettingsApi = {
  options: () => api.get('/api/sales-settings/options'),
  addOption: (payload) => api.post('/api/sales-settings/options', payload),
  updateOption: (id, payload) => api.patch(`/api/sales-settings/options/${id}`, payload),
  removeOption: (id) => api.delete(`/api/sales-settings/options/${id}`),
  listTemplates: () => api.get('/api/sales-settings/templates'),
  getTemplate: (id) => api.get(`/api/sales-settings/templates/${id}`),
  createTemplate: (payload) => api.post('/api/sales-settings/templates', payload),
  updateTemplate: (id, payload) => api.patch(`/api/sales-settings/templates/${id}`, payload),
  removeTemplate: (id) => api.delete(`/api/sales-settings/templates/${id}`),
};
