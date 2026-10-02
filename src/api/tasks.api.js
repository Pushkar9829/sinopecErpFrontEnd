import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (value === 'all' && key !== 'scope') return;
    search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const tasksApi = {
  list: (params) => api.get(`/api/tasks${queryString(params)}`),
  summary: () => api.get('/api/tasks/summary'),
  assignees: () => api.get('/api/tasks/assignees'),
  forOrder: (orderId) => api.get(`/api/tasks/order/${orderId}`),
  get: (id) => api.get(`/api/tasks/${id}`),
  create: (payload) => api.post('/api/tasks', payload),
  update: (id, payload) => api.patch(`/api/tasks/${id}`, payload),
  claim: (id) => api.post(`/api/tasks/${id}/claim`),
  comment: (id, text) => api.post(`/api/tasks/${id}/comments`, { text }),
};
