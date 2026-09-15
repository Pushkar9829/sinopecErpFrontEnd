import { api } from './client';

export const analyticsApi = {
  get: ({ from, to, stage } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (stage && stage !== 'all') params.set('stage', stage);
    const query = params.toString();
    return api.get(`/api/analytics${query ? `?${query}` : ''}`);
  },
};
