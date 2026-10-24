import { api, fetchBlob } from './client';

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const INTAKE_CHANGED_EVENT = 'intake:changed';

// Review actions change the counts in the sidebar badge and dashboard card.
function changes(promise) {
  return promise.then((result) => {
    window.dispatchEvent(new Event(INTAKE_CHANGED_EVENT));
    return result;
  });
}

export const intakeApi = {
  list: (params) => api.get(`/api/intake${query(params)}`),
  summary: () => api.get('/api/intake/summary'),
  get: (id) => api.get(`/api/intake/${id}`),
  match: (id) => api.get(`/api/intake/${id}/match`),
  products: (id, params) => api.get(`/api/intake/${id}/products${query(params)}`),
  customers: (q) => api.get(`/api/intake/customers${query({ q })}`),
  file: (id, fileId) => fetchBlob(`/api/intake/${id}/files/${fileId}`, 'Could not open the file'),
  settings: () => api.get('/api/intake/settings'),
  saveSettings: (payload) => api.put('/api/intake/settings', payload),
  createPanel: (payload) => changes(api.post('/api/intake/panel', payload)),
  readPanel: (formData) => changes(api.upload('/api/intake/panel/read', formData)),
  saveProposal: (id, proposal, version) => changes(api.put(`/api/intake/${id}`, { proposal, version })),
  useReading: (id, readingId, version) => changes(api.post(`/api/intake/${id}/readings/${readingId}/use`, { version })),
  reread: (id) => changes(api.post(`/api/intake/${id}/reread`, {})),
  markNotOrder: (id, version) => changes(api.post(`/api/intake/${id}/not-order`, { version })),
  discard: (id, reason, version) => changes(api.post(`/api/intake/${id}/discard`, { reason, version })),
  restore: (id) => changes(api.post(`/api/intake/${id}/restore`, {})),
  confirmCustomer: (id, payload) => changes(api.post(`/api/intake/${id}/customer`, payload)),
  clearCustomer: (id, version) => changes(api.delete(`/api/intake/${id}/customer`, { version })),
  convert: (id, payload) => changes(api.post(`/api/intake/${id}/convert`, payload)),
  gmailStart: () => api.post('/api/intake/gmail/start', {}),
  gmailDisconnect: () => api.post('/api/intake/gmail/disconnect', {}),
};
