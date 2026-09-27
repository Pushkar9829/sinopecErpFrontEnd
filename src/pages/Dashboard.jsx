import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { productionApi } from '../api/production.api';
import { salesOrdersApi } from '../api/salesOrders.api';
import { ActiveBadge, Badge, PriorityBadge, panelTones, valueTones } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { StageMenu } from '../components/ui/StageMenu';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { PRODUCTION_STAGES, PRODUCTION_VIEW_KEYS, canViewAnalytics, canViewSalesOrders, formatDate, formatQty } from '../lib/sales';

const DONE_LABEL = {
  rolling: 'Rolled',
  printing: 'Printed',
  cutting: 'Cut',
  dispatch: 'Dispatched',
  delivery: 'Delivered',
};

function jobFlag(job) {
  if (job.pickup?.qty) return 'working';
  if (job.readyQty) return 'ready';
  return 'waiting';
}

function FloorDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = usePermission();
  const stages = useMemo(() => {
    if (can('production:read') || can('production:packing:read')) return PRODUCTION_STAGES;
    return PRODUCTION_STAGES.filter((item) => can(item.read));
  }, [can]);
  const [stage, setStage] = useState('');
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!stages.length) return;
    const requested = searchParams.get('stage');
    const next = stages.some((item) => item.id === requested) ? requested : stages[0].id;
    setStage(next);
  }, [searchParams, stages]);

  useEffect(() => {
    if (!stage) return;
    setError('');
    productionApi
      .queue(stage)
      .then((data) => setJobs(data.jobs || []))
      .catch((err) => setError(err.message));
  }, [stage]);

  if (!stages.length) return null;

  function openJob(job) {
    navigate(`/production?stage=${stage}&job=${encodeURIComponent(job.id)}`);
  }

  return (
    <section className="-mx-5 -my-4 flex h-dvh min-h-0 flex-col md:-mx-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-card px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{PRODUCTION_STAGES.find((item) => item.id === stage)?.label || 'Stage'}</h1>
          <Link to={stage ? `/registers?stage=${stage}` : '/registers'} className="text-sm font-semibold text-ink underline">
            Register
          </Link>
          {stages.length > 1 ? (
            <StageMenu
              stages={stages}
              value={stage}
              onChange={(id) => {
                setStage(id);
                navigate(`/?stage=${id}`, { replace: true });
              }}
            />
          ) : null}
        </div>
        <p className="text-sm font-semibold text-ink">{jobs.length}</p>
      </div>
      {error ? <p className="px-4 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-auto bg-card">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-ink text-paper">
            <tr>
              <th className="px-3 py-2 font-semibold">Order</th>
              <th className="px-3 py-2 font-semibold">Customer</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Qty</th>
              <th className="px-3 py-2 font-semibold">{DONE_LABEL[stage] || 'Done'}</th>
              <th className="px-3 py-2 font-semibold">Left</th>
              <th className="px-3 py-2 font-semibold">Priority</th>
              <th className="px-3 py-2 font-semibold">Due</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const flag = jobFlag(job);
              return (
                <tr
                  key={job.id}
                  tabIndex={0}
                  onClick={() => openJob(job)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openJob(job);
                    }
                  }}
                  className="cursor-pointer border-t border-line hover:bg-paper/70"
                >
                  <td className="px-3 py-2 font-semibold">{job.number}</td>
                  <td className="px-3 py-2 font-normal">{job.customer || '—'}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{job.product}</p>
                    {job.requirements?.size ? <p className="text-sm font-normal text-slate">{job.requirements.size}</p> : null}
                  </td>
                  <td className="px-3 py-2 font-normal">
                    {formatQty(job.quantity)} {job.unit}
                  </td>
                  <td className={`px-3 py-2 ${valueTones.success}`}>{formatQty(job.progress?.output || 0)}</td>
                  <td className={`px-3 py-2 ${valueTones.warning}`}>{formatQty(job.progress?.remaining ?? job.quantity)}</td>
                  <td className="px-3 py-2">
                    <PriorityBadge priority={job.priority} />
                  </td>
                  <td className="px-3 py-2 text-slate">{formatDate(job.deliveryDate)}</td>
                  <td className="px-3 py-2">
                    {flag === 'working' ? <Badge tone="accent">Working</Badge> : null}
                    {flag === 'ready' ? <Badge tone="info">Ready</Badge> : null}
                    {flag === 'waiting' ? <Badge tone="muted">Waiting</Badge> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {jobs.length === 0 && !error ? (
          <EmptyState title="No sales orders" hint="Orders appear here when this station has work." />
        ) : null}
      </div>
    </section>
  );
}

const outlineLink =
  'inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper';

function Stat({ label, children }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className="mt-1 text-base font-semibold text-ink">{children}</div>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const { can } = usePermission();
  const showSales = canViewSalesOrders(can);
  const showAnalytics = canViewAnalytics(can);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!showSales) return;
    salesOrdersApi.summary().then(setSummary).catch(() => setSummary(null));
  }, [showSales]);

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

  const showFloor = PRODUCTION_VIEW_KEYS.some((key) => can(key));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Dashboard</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {can('sales:read') ? (
            <Link to="/customers" className={outlineLink}>
              Customers
            </Link>
          ) : null}
          {showSales ? (
            <Link to="/sales-orders" className={outlineLink}>
              Sales orders
            </Link>
          ) : null}
          {showAnalytics ? (
            <Link to="/analytics" className={outlineLink}>
              Analytics
            </Link>
          ) : null}
          {showFloor ? (
            <Link to="/production" className={outlineLink}>
              Production floor
            </Link>
          ) : null}
          {showFloor || showSales ? (
            <Link to="/registers" className={outlineLink}>
              Register
            </Link>
          ) : null}
          {can('inventory:read') ? (
            <Link to="/inventory" className={outlineLink}>
              Inventory
            </Link>
          ) : null}
          {can('production:read') || can('inventory:read') ? (
            <Link to="/stages" className={outlineLink}>
              Stages
            </Link>
          ) : null}
          {can('production:read') || can('inventory:read') ? (
            <Link to="/machines" className={outlineLink}>
              Machines
            </Link>
          ) : null}
          {can('users:read') ? (
            <Link to="/users" className={outlineLink}>
              Users
            </Link>
          ) : null}
          {can('roles:read') ? (
            <Link to="/roles" className={outlineLink}>
              Roles
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Name">{user?.fullName || user?.username || '—'}</Stat>
        <Stat label="Role">{user?.role?.name || '—'}</Stat>
        <Stat label="Status">
          <ActiveBadge active={Boolean(user?.isActive)} />
        </Stat>
      </div>

      {!hasLinks ? <p className="text-sm font-normal text-slate">No extra pages for this role yet.</p> : null}

      {showSales ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Sales orders</h2>
            <p className="text-sm font-normal text-slate">{summary?.total ?? 0} orders</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {salesCards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`rounded-xl border px-4 py-3 transition hover:brightness-95 ${panelTones[card.tone]}`}
              >
                <p className="text-sm font-semibold text-ink">{card.label}</p>
                <p className={`mt-1 text-xl font-semibold ${valueTones[card.tone]}`}>{card.value ?? 0}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { can } = usePermission();
  const floorOnly =
    user?.role?.slug !== 'super_admin' &&
    !can('sales:read') &&
    !can('users:read') &&
    PRODUCTION_VIEW_KEYS.some((key) => can(key));

  if (floorOnly) return <FloorDashboard />;
  return <AdminDashboard />;
}
