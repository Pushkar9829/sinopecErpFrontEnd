import { api } from './client';

const PARAMS = ['from', 'to', 'stage', 'orderType', 'customer', 'product', 'operator', 'machine'];

export const analyticsApi = {
  get: (filters = {}) => {
    const params = new URLSearchParams();
    for (const key of PARAMS) {
      const value = filters[key];
      if (value && value !== 'all') params.set(key, value);
    }
    const query = params.toString();
    return api.get(`/api/analytics${query ? `?${query}` : ''}`);
  },
};
