import { api, refreshSession } from './client';
import { clearAccessToken, takeAuthTokens } from '../lib/authTokens';

export const authApi = {
  login: async (username, password) => takeAuthTokens(await api.post('/api/auth/login', { username, password })),
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore expired sessions; local logout still clears state.
    } finally {
      clearAccessToken();
    }
  },
  // Rotates the httpOnly refresh cookie (serialised across tabs), then loads the user.
  refresh: async () => {
    if (!(await refreshSession())) throw new Error('Session expired');
    return api.get('/api/auth/me');
  },
  me: () => api.get('/api/auth/me'),
};
