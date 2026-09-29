import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

export function ProtectedRoute({ permission, anyOf }) {
  const { user, loading } = useAuth();
  const { can } = usePermission();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-steel">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
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
