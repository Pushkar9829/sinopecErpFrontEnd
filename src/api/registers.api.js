import { api, apiUrl } from './client';
import { getStoredTokens } from '../lib/authTokens';

export const registersApi = {
  list: () => api.get('/api/registers'),
  order: (orderId) => api.get(`/api/registers/order/${orderId}`),
  stage: (stage) => api.get(`/api/registers/stage/${stage}`),
  artwork: (orderId, itemId) => api.get(`/api/registers/artwork/${orderId}/${itemId}`),
};

export async function fetchArtworkFile(orderId, attachmentId) {
  const { accessToken } = getStoredTokens();
  const response = await fetch(apiUrl(`/api/registers/artwork/${orderId}/file/${attachmentId}`), {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) throw new Error('Could not open the artwork file');
  return response.blob();
}
