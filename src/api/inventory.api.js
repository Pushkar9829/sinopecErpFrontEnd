import { api } from './client';

export const inventoryApi = {
  listItems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/inventory/items${query ? `?${query}` : ''}`);
  },
  getItem: (id) => api.get(`/api/inventory/items/${id}`),
  createItem: (payload) => api.post('/api/inventory/items', payload),
  updateItem: (id, payload) => api.patch(`/api/inventory/items/${id}`, payload),
  removeItem: (id) => api.delete(`/api/inventory/items/${id}`),
  listStages: () => api.get('/api/inventory/stages'),
  getStage: (id) => api.get(`/api/inventory/stages/${id}`),
  createStage: (payload) => api.post('/api/inventory/stages', payload),
  updateStage: (id, payload) => api.patch(`/api/inventory/stages/${id}`, payload),
  removeStage: (id) => api.delete(`/api/inventory/stages/${id}`),
  meta: () => api.get('/api/inventory/meta'),
};
