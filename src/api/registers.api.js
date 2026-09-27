import { api } from './client';

export const registersApi = {
  list: () => api.get('/api/registers'),
  order: (orderId) => api.get(`/api/registers/order/${orderId}`),
  stage: (stage) => api.get(`/api/registers/stage/${stage}`),
};
