import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useFloorWorker, usePermission } from '../hooks/usePermission';
import { useIntakeSummary } from '../hooks/useIntakeSummary';
import { useTaskSummary } from '../hooks/useTaskSummary';
import { ANALYTICS_VIEW_KEYS, PRODUCTION_VIEW_KEYS, SALES_ORDER_VIEW_KEYS } from '../lib/sales';

const homeLink = { to: '/', label: 'Dashboard', end: true };

// Pages in sections that open and close; a section with no page the user may
// see is left out. Sections with a single page show as a plain link.
const sections = [
  {
    id: 'sales',
    label: 'Sales',
    links: [
      { to: '/sales-orders', label: 'Orders', anyOf: SALES_ORDER_VIEW_KEYS },
      { to: '/draft-orders', label: 'Draft orders', permission: 'intake:read', badge: 'drafts' },
      { to: '/customers', label: 'Customers', permission: 'sales:read' },
      { to: '/sales-settings', label: 'Product setup', permission: 'sales:read' },
      { to: '/rate-calculator', label: 'Rate calculator', permission: 'sales:read' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    links: [
      { to: '/registers', label: 'Register', anyOf: [...SALES_ORDER_VIEW_KEYS, ...PRODUCTION_VIEW_KEYS] },
      { to: '/stages', label: 'Stages', anyOf: ['production:read', 'inventory:read'] },
      { to: '/machines', label: 'Machines', anyOf: ['production:read', 'inventory:read'] },
      { to: '/inventory', label: 'Inventory', permission: 'inventory:read' },
      { to: '/suppliers', label: 'Suppliers', anyOf: ['inventory:read', 'production:read'] },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    links: [
      { to: '/books', label: 'Books', permission: 'accounts:read' },
      { to: '/receivables', label: 'Receivables', anyOf: ['accounts:read', 'sales:read'] },
      { to: '/purchases', label: 'Purchases', permission: 'accounts:read' },
      { to: '/cash-bank', label: 'Cash & bank', permission: 'accounts:read' },
      { to: '/statements', label: 'Statements', permission: 'accounts:read' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    links: [
      { to: '/reports', label: 'Reports', anyOf: ['accounts:read', 'sales:read', 'production:read', 'dispatch:read', 'inventory:read'] },
      { to: '/analytics', label: 'Analytics', anyOf: ANALYTICS_VIEW_KEYS },
    ],
  },
  { id: 'tasks', label: 'Tasks', links: [{ to: '/tasks', label: 'Tasks', permission: 'tasks:read', badge: 'tasks' }] },
  {
    id: 'settings',
    label: 'Settings',
    links: [
      // No role holds this key, so only the Super Admin (who passes every check) sees it.
      { to: '/company', label: 'Company details', permission: 'company:update' },
      { to: '/settings/form-fields', label: 'Form fields', permission: 'company:update' },
      { to: '/users', label: 'Users', permission: 'users:read' },
      { to: '/roles', label: 'Roles', permission: 'roles:read' },
      { to: '/audit-logs', label: 'Audit log', permission: 'audit:read' },
    ],
  },
];

const OPEN_KEY = 'sinopec.sidebar.open';
function readOpen() {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
const onPath = (to, pathname) => pathname === to || pathname.startsWith(`${to}/`);

function Badge({ count }) {
  if (!count) return null;
  return <span className="min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-xs font-semibold text-white">{count > 99 ? '99+' : count}</span>;
}

function Item({ link, badges, nested = false }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        `flex items-center justify-between gap-2 rounded-lg py-2.5 text-sm lg:py-1.5 ${nested ? 'pl-6 pr-3' : 'px-3'} ${
          isActive ? 'bg-accent text-white' : 'text-paper/80 hover:bg-white/10'
        }`
      }
    >
      {link.label}
      <Badge count={link.badge ? badges[link.badge] : 0} />
    </NavLink>
  );
}

export function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();
  const { can } = usePermission();
  const floorWorker = useFloorWorker();
  const { pathname } = useLocation();
  const taskSummary = useTaskSummary();
  const intakeSummary = useIntakeSummary();
  const badges = { tasks: taskSummary?.total || 0, drafts: intakeSummary?.needsReview || 0 };
  const allowed = (link) => (link.permission ? can(link.permission) : link.anyOf ? link.anyOf.some((key) => can(key)) : true);
  const visible = sections.map((section) => ({ ...section, links: section.links.filter(allowed) })).filter((section) => section.links.length);
  // A handful of pages (floor operators) reads better as a plain list.
  const flat = visible.reduce((n, section) => n + section.links.length, 0) <= 6;
  const [opened, setOpened] = useState(readOpen);
  // The section holding the current page opens by itself; closing it lasts
  // until the next page inside it is opened.
  const [closedHere, setClosedHere] = useState({});
  function toggle(id, isOpen, here) {
    if (here) {
      setClosedHere({ ...closedHere, [id]: isOpen ? pathname : null });
      return;
    }
    const next = { ...opened, [id]: !isOpen };
    setOpened(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      // Private window or blocked storage: the choice lasts until reload.
    }
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full print:hidden w-64 max-w-[80vw] shrink-0 flex-col border-r border-white/10 bg-ink text-paper transition-transform duration-200 lg:static lg:z-auto lg:w-48 lg:max-w-none lg:translate-x-0 lg:transition-none ${
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
        {floorWorker ? null : <Item link={homeLink} badges={badges} />}
        {visible.map((section) => {
          if (flat || section.links.length === 1) return section.links.map((link) => <Item key={link.to} link={link} badges={badges} />);
          const here = section.links.some((link) => onPath(link.to, pathname));
          const isOpen = here ? closedHere[section.id] !== pathname : Boolean(opened[section.id]);
          const waiting = section.links.reduce((n, link) => n + (link.badge ? badges[link.badge] || 0 : 0), 0);
          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggle(section.id, isOpen, here)}
                aria-expanded={isOpen}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold lg:py-1.5 ${here ? 'text-white' : 'text-paper/80'} hover:bg-white/10`}
              >
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {section.label}
                </span>
                {isOpen ? null : <Badge count={waiting} />}
              </button>
              {isOpen ? (
                <div className="mt-0.5 space-y-0.5">
                  {section.links.map((link) => (
                    <Item key={link.to} link={link} badges={badges} nested />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
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
