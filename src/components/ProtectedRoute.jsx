import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

export function ProtectedRoute({ permission, anyOf }) {
  const { user, loading } = useAuth();
  const { can } = usePermission();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-steel">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = permission
    ? can(permission)
    : anyOf?.length
      ? anyOf.some((key) => can(key))
      : true;

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
