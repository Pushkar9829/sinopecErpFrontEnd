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
  { to: '/registers', label: 'Register', anyOf: [...SALES_ORDER_VIEW_KEYS, ...PRODUCTION_VIEW_KEYS] },
  { to: '/roles', label: 'Roles', permission: 'roles:read' },
  { to: '/sales-orders', label: 'Sales Orders', anyOf: SALES_ORDER_VIEW_KEYS },
  { to: '/stages', label: 'Stages', anyOf: ['production:read', 'inventory:read'] },
  { to: '/users', label: 'Users', permission: 'users:read' },
].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));

const links = [homeLink, ...pageLinks];

export function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();
  const { can } = usePermission();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 max-w-[80vw] shrink-0 flex-col border-r border-white/10 bg-ink text-paper transition-transform duration-200 lg:static lg:z-auto lg:w-48 lg:max-w-none lg:translate-x-0 lg:transition-none ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-steel">Sinopec</p>
          <p className="mt-1 text-base font-semibold">Access Control</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 hover:bg-white/10 lg:hidden"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
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
                `block rounded-lg px-3 py-2.5 text-sm lg:py-1.5 ${
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
