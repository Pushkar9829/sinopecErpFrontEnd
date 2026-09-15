import { api, apiUrl } from './client';

export const salesOrdersApi = {
  list: () => api.get('/api/sales-orders'),
  summary: () => api.get('/api/sales-orders/summary'),
  meta: () => api.get('/api/sales-orders/meta'),
  get: (id) => api.get(`/api/sales-orders/${id}`),
  create: (payload) => api.post('/api/sales-orders', payload),
  update: (id, payload) => api.patch(`/api/sales-orders/${id}`, payload),
  remove: (id) => api.delete(`/api/sales-orders/${id}`),
  submit: (id) => api.post(`/api/sales-orders/${id}/submit`),
  approve: (id) => api.post(`/api/sales-orders/${id}/approve`),
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
};

export async function downloadSalesOrderFile(orderId, attachmentId, fileName) {
  const response = await fetch(apiUrl(`/api/sales-orders/${orderId}/attachments/${attachmentId}/file`), {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Download failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
