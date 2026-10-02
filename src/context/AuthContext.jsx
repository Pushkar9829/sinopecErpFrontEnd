import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const current = await authApi.me();
        if (!cancelled) setUser(current);
      } catch {
        try {
          const refreshed = await authApi.refresh();
          if (!cancelled) setUser(refreshed);
        } catch {
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    function onExpired() {
      if (!cancelled) setUser(null);
    }
    let lastStale = 0;
    function onStale() {
      if (cancelled || Date.now() - lastStale < 5000) return;
      lastStale = Date.now();
      authApi
        .me()
        .then((current) => {
          if (!cancelled) setUser(current);
        })
        .catch(() => {});
    }
    window.addEventListener('auth:expired', onExpired);
    window.addEventListener('auth:stale', onStale);
    return () => {
      cancelled = true;
      window.removeEventListener('auth:expired', onExpired);
      window.removeEventListener('auth:stale', onStale);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(username, password) {
        const nextUser = await authApi.login(username, password);
        setUser(nextUser);
        return nextUser;
      },
      async refreshUser() {
        const current = await authApi.me();
        setUser(current);
        return current;
      },
      async logout() {
        await authApi.logout();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
