import { api } from './client';

export const productionApi = {
  jobSheet: (orderId, stage) => api.get(`/api/production/job-sheet/${orderId}${stage ? `?stage=${stage}` : ''}`),
  stageSheet: (stage) => api.get(`/api/production/stage-sheet/${stage}`),
  queue: (stage) => api.get(`/api/production/queue${stage ? `?stage=${stage}` : ''}`),
  machines: (stage) => api.get(`/api/production/machines/${stage}`),
  pickup: (payload) => api.post('/api/production/pickup', payload),
  release: (payload) => api.post('/api/production/release', payload),
  complete: (payload) => api.post('/api/production/complete', payload),
  enter: (payload) => api.post('/api/production/enter', payload),
  updateEntry: (payload) => api.post('/api/production/entry/update', payload),
  deleteEntry: (payload) => api.post('/api/production/entry/delete', payload),
  closeStage: (payload) => api.post('/api/production/close-stage', payload),
};
