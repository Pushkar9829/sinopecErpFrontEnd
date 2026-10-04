import { api } from './client';

export const intakeApi = {
  list: () => api.get('/api/intake'),
  get: (id) => api.get(`/api/intake/${id}`),
  settings: () => api.get('/api/intake/settings'),
  saveSettings: (payload) => api.put('/api/intake/settings', payload),
  paste: (text) => api.post('/api/intake/paste', { text }),
  createPanel: (payload) => api.post('/api/intake/panel', payload),
  readPanel: (formData) => api.upload('/api/intake/panel/read', formData),
  saveProposal: (id, proposal) => api.put(`/api/intake/${id}`, { proposal }),
  markPotential: (id) => api.post(`/api/intake/${id}/potential`),
  markNotOrder: (id) => api.post(`/api/intake/${id}/not-order`),
  reread: (id) => api.post(`/api/intake/${id}/reread`),
  discard: (id) => api.post(`/api/intake/${id}/discard`),
  gmailStart: () => api.post('/api/intake/gmail/start'),
};
