import { api, fetchBlob } from './client';

export const registersApi = {
  list: () => api.get('/api/registers'),
  order: (orderId) => api.get(`/api/registers/order/${orderId}`),
  stage: (stage) => api.get(`/api/registers/stage/${stage}`),
  artwork: (orderId, itemId) => api.get(`/api/registers/artwork/${orderId}/${itemId}`),
};

export function fetchArtworkFile(orderId, attachmentId) {
  return fetchBlob(`/api/registers/artwork/${orderId}/file/${attachmentId}`, 'Could not open the artwork file');
}
