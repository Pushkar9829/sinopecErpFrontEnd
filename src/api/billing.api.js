import { api } from './client';
import { notifyTasksChanged } from '../lib/tasks';

const changed = (promise) =>
  promise.then((result) => {
    notifyTasksChanged();
    return result;
  });

export const billingApi = {
  invoiceDraft: (orderId) => api.get(`/api/billing/orders/${orderId}/invoice-draft`),
  createInvoice: (orderId, payload) => changed(api.post(`/api/billing/orders/${orderId}/invoices`, payload)),
  receivables: () => api.get('/api/billing/receivables'),
  invoices: (params = {}) => api.get(`/api/billing/invoices?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`),
  invoice: (id) => api.get(`/api/billing/invoices/${id}`),
  cancelInvoice: (id, reason) => changed(api.post(`/api/billing/invoices/${id}/cancel`, { reason })),
  ledger: (customerId) => api.get(`/api/billing/customers/${customerId}/ledger`),
  addOpening: (customerId, payload) => api.post(`/api/billing/customers/${customerId}/openings`, payload),
  importOpenings: (rows, apply) => api.post('/api/billing/openings/import', { rows, apply }),
  addReceipt: (customerId, payload) => changed(api.post(`/api/billing/customers/${customerId}/receipts`, payload)),
  voidReceipt: (id, reason) => changed(api.post(`/api/billing/receipts/${id}/void`, { reason })),
};
