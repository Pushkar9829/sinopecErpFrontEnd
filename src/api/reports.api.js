import { api } from './client';

const query = (period) => new URLSearchParams(Object.entries(period || {}).filter(([, v]) => v)).toString();

export const reportsApi = {
  accounts: (period) => api.get(`/api/reports/accounts?${query(period)}`),
};
