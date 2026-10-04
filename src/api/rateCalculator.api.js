import { api } from './client';

export const rateCalculatorApi = {
  defaults: () => api.get('/api/rate-calculator/defaults'),
  jobWork: (values) => api.post('/api/rate-calculator/job-work', values),
  salesOrder: (values) => api.post('/api/rate-calculator/sales-order', values),
  rolling: (values) => api.post('/api/rate-calculator/rolling', values),
};
