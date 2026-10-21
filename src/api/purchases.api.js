import { api } from './client';

const qs = (params = {}) => {
  const text = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')).toString();
  return text ? `?${text}` : '';
};

export const purchasesApi = {
  options: () => api.get('/api/purchases/options'),
  payables: () => api.get('/api/purchases/payables'),
  bills: (params) => api.get(`/api/purchases/bills${qs(params)}`),
  bill: (id) => api.get(`/api/purchases/bills/${id}`),
  createBill: (payload) => api.post('/api/purchases/bills', payload),
  cancelBill: (id, reason) => api.post(`/api/purchases/bills/${id}/cancel`, { reason }),
  payments: (params) => api.get(`/api/purchases/payments${qs(params)}`),
  voidPayment: (id, reason) => api.post(`/api/purchases/payments/${id}/void`, { reason }),
  debitNotes: (params) => api.get(`/api/purchases/debit-notes${qs(params)}`),
  cancelDebitNote: (id, reason) => api.post(`/api/purchases/debit-notes/${id}/cancel`, { reason }),
  account: (supplierId) => api.get(`/api/purchases/suppliers/${supplierId}/account`),
  lots: (supplierId) => api.get(`/api/purchases/suppliers/${supplierId}/lots`),
  addOpening: (supplierId, payload) => api.post(`/api/purchases/suppliers/${supplierId}/openings`, payload),
  pay: (supplierId, payload) => api.post(`/api/purchases/suppliers/${supplierId}/payments`, payload),
  debitNote: (supplierId, payload) => api.post(`/api/purchases/suppliers/${supplierId}/debit-notes`, payload),
};
