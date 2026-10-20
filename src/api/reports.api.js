import { api } from './client';

const query = (period) => new URLSearchParams(Object.entries(period || {}).filter(([, v]) => v)).toString();

export const reportsApi = {
  overview: (period) => api.get(`/api/reports/overview?${query(period)}`),
  sales: (period) => api.get(`/api/reports/sales?${query(period)}`),
  accounts: (period) => api.get(`/api/reports/accounts?${query(period)}`),
};
