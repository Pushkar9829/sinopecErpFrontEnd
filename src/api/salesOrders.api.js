import { api, fetchBlob, saveBlob } from './client';

export const salesOrdersApi = {
  list: () => api.get('/api/sales-orders'),
  // One page of slim rows: { items, total, page, pageSize, pages, counts }.
  page: (params) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') query.set(key, value);
    }
    return api.get(`/api/sales-orders?${query.toString()}`);
  },
  summary: () => api.get('/api/sales-orders/summary'),
  meta: () => api.get('/api/sales-orders/meta'),
  get: (id) => api.get(`/api/sales-orders/${id}`),
  create: (payload) => api.post('/api/sales-orders', payload),
  update: (id, payload) => api.patch(`/api/sales-orders/${id}`, payload),
  remove: (id) => api.delete(`/api/sales-orders/${id}`),
  submit: (id) => api.post(`/api/sales-orders/${id}/submit`),
  approve: (id, creditOverrideReason) => api.post(`/api/sales-orders/${id}/approve`, creditOverrideReason ? { creditOverrideReason } : {}),
  returnToDraft: (id, reason) => api.post(`/api/sales-orders/${id}/return`, { reason }),
  planProduction: (id) => api.post(`/api/sales-orders/${id}/plan-production`),
  advance: (id) => api.post(`/api/sales-orders/${id}/advance`),
  cancel: (id, reason) => api.post(`/api/sales-orders/${id}/cancel`, { reason }),
  addAttachment: (id, file, kind) => {
    const body = new FormData();
    body.append('file', file);
    body.append('kind', kind || 'other');
    return api.upload(`/api/sales-orders/${id}/attachments`, body);
  },
  removeAttachment: (id, attachmentId) => api.delete(`/api/sales-orders/${id}/attachments/${attachmentId}`),
  recordPayment: (id, payload) => api.post(`/api/sales-orders/${id}/payments`, payload),
  removePayment: (id, paymentId, reason) => api.delete(`/api/sales-orders/${id}/payments/${paymentId}`, { reason }),
};

export async function downloadSalesOrderFile(orderId, attachmentId, fileName) {
  const blob = await fetchBlob(`/api/sales-orders/${orderId}/attachments/${attachmentId}/file`);
  saveBlob(blob, fileName || 'attachment');
}
