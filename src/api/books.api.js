import { api } from './client';

const qs = (params = {}) => {
  const text = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return text ? `?${text}` : '';
};

export const booksApi = {
  settings: () => api.get('/api/books/settings'),
  saveSettings: (payload) => api.put('/api/books/settings', payload),
  accounts: () => api.get('/api/books/accounts'),
  createAccount: (payload) => api.post('/api/books/accounts', payload),
  updateAccount: (id, payload) => api.patch(`/api/books/accounts/${id}`, payload),
  deleteAccount: (id) => api.delete(`/api/books/accounts/${id}`),
  saveOpenings: (rows) => api.put('/api/books/openings', { rows }),
  vouchers: (params) => api.get(`/api/books/vouchers${qs(params)}`),
  voucher: (id) => api.get(`/api/books/vouchers/${id}`),
  createVoucher: (payload) => api.post('/api/books/vouchers', payload),
  cancelVoucher: (id, reason) => api.post(`/api/books/vouchers/${id}/cancel`, { reason }),
  ledger: (accountId, params) => api.get(`/api/books/ledger/${accountId}${qs(params)}`),
  tds: (params) => api.get(`/api/books/tds${qs(params)}`),
  trialBalance: (asOf) => api.get(`/api/books/trial-balance${qs({ asOf })}`),
  sync: () => api.post('/api/books/sync', {}),
};
