import { clearStoredTokens, getStoredTokens, setStoredTokens } from '../lib/authTokens';

const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  if (!path.startsWith('/')) return path;
  return API_BASE ? `${API_BASE}${path}` : path;
}

export function resolveMediaUrl(value) {
  if (!value) return '';
  if (
    String(value).startsWith('http://') ||
    String(value).startsWith('https://') ||
    String(value).startsWith('data:') ||
    String(value).startsWith('blob:')
  ) {
    return value;
  }
  return apiUrl(value);
}

let refreshPromise = null;

async function parseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function authHeaders() {
  const { accessToken } = getStoredTokens();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function request(path, options = {}, retry = true) {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(headers || {}),
    },
    ...rest,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (
    response.status === 401 &&
    retry &&
    path !== '/api/auth/refresh' &&
    path !== '/api/auth/login'
  ) {
    refreshPromise =
      refreshPromise ||
      (async () => {
        const { refreshToken } = getStoredTokens();
        const refreshed = await fetch(apiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        });
        if (refreshed.ok) {
          const payload = await parseBody(refreshed);
          const data = payload.data !== undefined ? payload.data : payload;
          if (data?.accessToken || data?.refreshToken) {
            setStoredTokens({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            });
          }
        } else {
          clearStoredTokens();
        }
        return refreshed;
      })().finally(() => {
        refreshPromise = null;
      });

    const refreshed = await refreshPromise;
    if (refreshed.ok) {
      return request(path, options, false);
    }
  }

  const payload = await parseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload.data !== undefined ? payload.data : payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, body) => request(path, { method: 'POST', body }),
};
