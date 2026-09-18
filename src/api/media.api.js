import { api } from './client';

export const mediaApi = {
  upload: (file, folder = 'misc') => {
    const body = new FormData();
    body.append('file', file);
    body.append('folder', folder);
    return api.upload('/api/media', body);
  },
};
