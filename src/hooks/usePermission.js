import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function matchesPermission(ownedKeys, requiredKey) {
  if (!ownedKeys?.length) return false;
  if (ownedKeys.includes('*') || ownedKeys.includes(requiredKey)) return true;

  const parts = requiredKey.split(':');
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const wildcard = [...parts.slice(0, i), '*'].join(':');
    if (ownedKeys.includes(wildcard)) return true;
  }
  return false;
}

export function usePermission() {
  const { user } = useAuth();

  const can = useCallback(
    (key) => {
      if (!user) return false;
      if (user.role?.slug === 'super_admin') return true;
      return matchesPermission(user.permissions, key);
    },
    [user]
  );

  return { can, user };
}

const OFFICE_KEYS = ['sales:read', 'users:read', 'production:read', 'inventory:read', 'accounts:read'];
const FLOOR_KEYS = ['production:rolling:read', 'production:printing:read', 'production:cutting:read', 'dispatch:read'];

// Station operators and the dispatch manager: they work from Tasks and the Register only.
export function useFloorWorker() {
  const { can, user } = usePermission();
  if (!user || user.role?.slug === 'super_admin') return false;
  return !OFFICE_KEYS.some((key) => can(key)) && FLOOR_KEYS.some((key) => can(key));
}
