import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesOrdersApi } from '../api/salesOrders.api';
import { ActiveBadge, panelTones, valueTones } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { canSeeCommercial, canViewAnalytics, canViewSalesOrders } from '../lib/sales';

export function Dashboard() {
  const { user } = useAuth();
  const { can } = usePermission();
  const showSales = canViewSalesOrders(can);
  const showAnalytics = canViewAnalytics(can);
  const showMoney = canSeeCommercial(can);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!showSales) return;
    salesOrdersApi.summary().then(setSummary).catch(() => setSummary(null));
  }, [showSales]);

  const cards = [
    { label: 'Signed in as', value: user?.username || '—', tone: 'muted' },
    { label: 'Role', value: user?.role?.name || '—', tone: 'info' },
    { label: 'Status', value: user?.isActive ? 'Active' : 'Inactive', tone: user?.isActive ? 'success' : 'danger' },
  ];

  const salesCards = [
    { label: 'Draft', value: summary?.draft ?? 0, to: '/sales-orders', tone: 'muted' },
    { label: 'Submitted', value: summary?.submitted ?? 0, to: '/sales-orders', tone: 'warning' },
    { label: 'Approved', value: summary?.approved ?? 0, to: '/sales-orders', tone: 'info' },
    { label: 'In production', value: summary?.inProductionGroup ?? 0, to: '/sales-orders', tone: 'accent' },
    { label: 'Packed', value: summary?.packed ?? 0, to: '/sales-orders', tone: 'purple' },
    { label: 'Dispatch', value: summary?.dispatchGroup ?? 0, to: '/sales-orders', tone: 'teal' },
    { label: 'Delivered', value: summary?.delivered ?? 0, to: '/sales-orders', tone: 'success' },
    { label: 'Completed', value: summary?.completed ?? 0, to: '/sales-orders', tone: 'success' },
    { label: 'Cancelled', value: summary?.cancelled ?? 0, to: '/sales-orders', tone: 'danger' },
  ];

  const hasLinks =
    can('sales:read') ||
    showSales ||
    showAnalytics ||
    can('inventory:read') ||
    can('production:read') ||
    can('production:rolling:read') ||
    can('production:printing:read') ||
    can('production:cutting:read') ||
    can('dispatch:read') ||
    can('users:read') ||
    can('roles:read');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-steel">Overview</p>
        <h1 className="mt-2 text-xl font-semibold">Welcome, {user?.fullName}</h1>
        <p className="mt-1 text-sm text-slate">Sign in with your role to open the screens you can use.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <section key={card.label} className={`rounded-xl border p-5 ${panelTones[card.tone]}`}>
            <p className="text-xs uppercase tracking-wide text-steel">{card.label}</p>
            {card.label === 'Status' ? (
              <div className="mt-2">
                <ActiveBadge active={Boolean(user?.isActive)} />
              </div>
            ) : (
              <p className={`mt-2 text-base font-medium ${valueTones[card.tone]}`}>{card.value}</p>
            )}
          </section>
        ))}
      </div>

      {showSales ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Sales orders</h2>
            {showMoney && summary ? <p className="text-sm text-slate">{summary.total} orders</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {salesCards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`rounded-xl border p-4 transition hover:brightness-95 ${panelTones[card.tone]}`}
              >
                <p className="text-xs uppercase tracking-wide text-steel">{card.label}</p>
                <p className={`mt-2 text-xl font-semibold ${valueTones[card.tone]}`}>{card.value ?? 0}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-medium">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {can('sales:read') ? (
            <Link to="/customers" className="rounded-lg bg-ink px-3 py-2 text-sm text-paper hover:bg-accent">
              Customers
            </Link>
          ) : null}
          {showSales ? (
            <Link to="/sales-orders" className="rounded-lg bg-ink px-3 py-2 text-sm text-paper hover:bg-accent">
              Sales orders
            </Link>
          ) : null}
          {showAnalytics ? (
            <Link to="/analytics" className="rounded-lg bg-ink px-3 py-2 text-sm text-paper hover:bg-accent">
              Analytics
            </Link>
          ) : null}
          {can('production:read') ||
          can('production:rolling:read') ||
          can('production:printing:read') ||
          can('production:cutting:read') ||
          can('dispatch:read') ? (
            <Link to="/production" className="rounded-lg bg-ink px-3 py-2 text-sm text-paper hover:bg-accent">
              Production floor
            </Link>
          ) : null}
          {can('inventory:read') ? (
            <Link to="/inventory" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper">
              Inventory
            </Link>
          ) : null}
          {can('production:read') || can('inventory:read') ? (
            <Link to="/stages" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper">
              Stages
            </Link>
          ) : null}
          {can('production:read') || can('inventory:read') ? (
            <Link to="/machines" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper">
              Machines
            </Link>
          ) : null}
          {can('users:read') ? (
            <Link to="/users" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper">
              Manage users
            </Link>
          ) : null}
          {can('roles:read') ? (
            <Link to="/roles" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper">
              Review roles
            </Link>
          ) : null}
          {!hasLinks ? <p className="text-sm text-slate">No extra pages for this role yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
