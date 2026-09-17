const STORAGE_KEY = 'sinopec_auth_tokens';

export function getStoredTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken || null,
      refreshToken: parsed.refreshToken || null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function setStoredTokens({ accessToken, refreshToken } = {}) {
  if (!accessToken && !refreshToken) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const current = getStoredTokens();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: accessToken ?? current.accessToken,
      refreshToken: refreshToken ?? current.refreshToken,
    })
  );
}

export function clearStoredTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export function takeAuthTokens(payload) {
  if (!payload || typeof payload !== 'object') {
    return { user: payload, accessToken: null, refreshToken: null };
  }
  const { accessToken, refreshToken, ...user } = payload;
  if (accessToken || refreshToken) {
    setStoredTokens({ accessToken, refreshToken });
  }
  return { user, accessToken, refreshToken };
}
