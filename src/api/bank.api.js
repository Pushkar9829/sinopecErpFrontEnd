import { api } from './client';

const qs = (params = {}) => {
  const text = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')).toString();
  return text ? `?${text}` : '';
};

export const bankApi = {
  accounts: () => api.get('/api/bank/accounts'),
  addAccount: (payload) => api.post('/api/bank/accounts', payload),
  lines: (accountId, params) => api.get(`/api/bank/accounts/${accountId}/statement${qs(params)}`),
  importStatement: (accountId, rows) => api.post(`/api/bank/accounts/${accountId}/statement`, { rows }),
  deleteImport: (accountId, batch) => api.delete(`/api/bank/accounts/${accountId}/statement/${encodeURIComponent(batch)}`),
  autoMatch: (accountId) => api.post(`/api/bank/accounts/${accountId}/auto-match`, {}),
  reconciliation: (accountId, asOf) => api.get(`/api/bank/accounts/${accountId}/reconciliation${qs({ asOf })}`),
  candidates: (lineId) => api.get(`/api/bank/lines/${lineId}/candidates`),
  match: (lineId, voucherId) => api.post(`/api/bank/lines/${lineId}/match`, { voucherId }),
  unmatch: (lineId) => api.post(`/api/bank/lines/${lineId}/unmatch`, {}),
  ignore: (lineId, note) => api.post(`/api/bank/lines/${lineId}/ignore`, { note }),
  entryFromLine: (lineId, payload) => api.post(`/api/bank/lines/${lineId}/entry`, payload),
  expenses: (params) => api.get(`/api/bank/expenses${qs(params)}`),
  expenseOptions: () => api.get('/api/bank/expenses/options'),
  createExpense: (payload) => api.post('/api/bank/expenses', payload),
};
