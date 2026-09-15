import { usePermission } from '../hooks/usePermission';

export function PermissionGate({ permission, children }) {
  const { can } = usePermission();
  if (!can(permission)) return null;
  return children;
}
