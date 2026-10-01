import { api } from './client';

export const auditApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value != null) query.set(key, value);
    }
    const text = query.toString();
    return api.get(`/api/audit-logs${text ? `?${text}` : ''}`);
  },
  meta: () => api.get('/api/audit-logs/meta'),
};
