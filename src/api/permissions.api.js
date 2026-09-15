import { api } from './client';

export const permissionsApi = {
  list: () => api.get('/api/permissions'),
};
