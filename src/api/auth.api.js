import { api } from './client';
import { clearStoredTokens, getStoredTokens, takeAuthTokens } from '../lib/authTokens';

function withStoredTokens(data) {
  const { user } = takeAuthTokens(data);
  return user;
}

export const authApi = {
  login: async (username, password) =>
    withStoredTokens(await api.post('/api/auth/login', { username, password })),
  logout: async () => {
    const { refreshToken } = getStoredTokens();
    try {
      await api.post('/api/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      // Ignore expired sessions; local logout still clears state.
    } finally {
      clearStoredTokens();
    }
  },
  refresh: async () => {
    const { refreshToken } = getStoredTokens();
    return withStoredTokens(
      await api.post('/api/auth/refresh', refreshToken ? { refreshToken } : {})
    );
  },
  me: () => api.get('/api/auth/me'),
};
