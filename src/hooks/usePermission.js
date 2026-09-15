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

  const can = (key) => {
    if (!user) return false;
    if (user.role?.slug === 'super_admin') return true;
    return matchesPermission(user.permissions, key);
  };

  return { can, user };
}
