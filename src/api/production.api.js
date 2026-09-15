import { api } from './client';

export const productionApi = {
  queue: (stage) => api.get(`/api/production/queue${stage ? `?stage=${stage}` : ''}`),
  machines: (stage) => api.get(`/api/production/machines/${stage}`),
  pickup: (payload) => api.post('/api/production/pickup', payload),
  release: (payload) => api.post('/api/production/release', payload),
  complete: (payload) => api.post('/api/production/complete', payload),
};
