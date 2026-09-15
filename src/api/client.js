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

async function request(path, options = {}, retry = true) {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
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
      fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).finally(() => {
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
