import { clearAccessToken, getAccessToken, takeAuthTokens } from '../lib/authTokens';
import { notifyTasksChanged } from '../lib/tasks';

const TASK_SOURCES = /^\/api\/(sales-orders|production|inventory|intake)(\/|$)/;

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
  const accessToken = getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function postRefresh() {
  const refreshed = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (refreshed.ok) {
    const payload = await parseBody(refreshed);
    takeAuthTokens(payload.data !== undefined ? payload.data : payload);
  } else {
    clearAccessToken();
  }
  return refreshed.ok;
}

// The API rotates the refresh cookie on every use and the cookie is shared by
// all tabs. The Web Lock makes tabs refresh one after another, so each one
// sends the newest cookie instead of racing on the same old token.
export function refreshSession() {
  refreshPromise =
    refreshPromise ||
    (typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('sinopec-auth-refresh', postRefresh)
      : postRefresh()
    ).finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function shouldRefresh(response, path, retry) {
  return response.status === 401 && retry && path !== '/api/auth/refresh' && path !== '/api/auth/login';
}

async function send(path, options = {}, retry = true) {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: {
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(headers || {}),
    },
    ...rest,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (shouldRefresh(response, path, retry)) {
    if (await refreshSession()) return send(path, options, false);
    window.dispatchEvent(new Event('auth:expired'));
  }
  return response;
}

async function request(path, options = {}) {
  const response = await send(path, options);
  const payload = await parseBody(response);
  if (!response.ok) {
    if (response.status === 403 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event('auth:stale'));
    const error = new Error(payload.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  if (options.method && options.method !== 'GET' && TASK_SOURCES.test(path)) notifyTasksChanged();

  return payload.data !== undefined ? payload.data : payload;
}

// Authenticated binary download with the same refresh-on-401 handling.
export async function fetchBlob(path, errorMessage = 'Download failed') {
  const response = await send(path);
  if (!response.ok) {
    const payload = await parseBody(response);
    throw new Error(payload.message || errorMessage);
  }
  return response.blob();
}

export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking straight after click() can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path, body) => request(path, { method: 'DELETE', body }),
  upload: (path, body) => request(path, { method: 'POST', body }),
};
