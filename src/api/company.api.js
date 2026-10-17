import { api } from './client';

export const companyApi = {
  get: () => api.get('/api/company-settings'),
  save: (payload) => api.put('/api/company-settings', payload),
};
