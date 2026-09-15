import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { ANALYTICS_VIEW_KEYS, PRODUCTION_VIEW_KEYS, SALES_ORDER_VIEW_KEYS } from '../lib/sales';

const homeLink = { to: '/', label: 'Dashboard', end: true };

const pageLinks = [
  { to: '/analytics', label: 'Analytics', anyOf: ANALYTICS_VIEW_KEYS },
  { to: '/customers', label: 'Customers', permission: 'sales:read' },
  { to: '/inventory', label: 'Inventory', permission: 'inventory:read' },
  { to: '/machines', label: 'Machines', anyOf: ['production:read', 'inventory:read'] },
  { to: '/sales-settings', label: 'Product setup', permission: 'sales:read' },
  { to: '/production', label: 'Production floor', anyOf: PRODUCTION_VIEW_KEYS },
  { to: '/roles', label: 'Roles', permission: 'roles:read' },
  { to: '/sales-orders', label: 'Sales Orders', anyOf: SALES_ORDER_VIEW_KEYS },
  { to: '/stages', label: 'Stages', anyOf: ['production:read', 'inventory:read'] },
  { to: '/users', label: 'Users', permission: 'users:read' },
].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));

const links = [homeLink, ...pageLinks];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { can } = usePermission();

  return (
    <aside className="flex h-full w-48 shrink-0 flex-col border-r border-white/10 bg-ink text-paper">
      <div className="border-b border-white/10 px-3 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-steel">Sinopec</p>
        <p className="mt-1 text-base font-semibold">Access Control</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {links
          .filter((link) => {
            if (link.permission) return can(link.permission);
            if (link.anyOf) return link.anyOf.some((key) => can(key));
            return true;
          })
          .map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-1.5 text-sm ${
                  isActive ? 'bg-accent text-white' : 'text-paper/80 hover:bg-white/10'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <p className="truncate text-sm font-medium">{user?.fullName}</p>
        <p className="truncate text-xs text-steel">{user?.role?.name}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded border border-steel px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
