// The refresh token lives only in an httpOnly cookie set by the API. The
// short-lived access token is kept in memory as a Bearer fallback and is never
// written to localStorage, so injected script can't lift a long-lived session.

const LEGACY_STORAGE_KEY = 'sinopec_auth_tokens';

let accessToken = null;

try {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
} catch {
  // Storage blocked; nothing to clean up.
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

export function takeAuthTokens(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  // eslint-disable-next-line no-unused-vars
  const { accessToken: token, refreshToken, ...user } = payload;
  if (token) accessToken = token;
  return user;
}
