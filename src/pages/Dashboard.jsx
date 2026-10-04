import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { analyticsApi } from '../api/analytics.api';
import { productionApi } from '../api/production.api';
import { salesOrdersApi } from '../api/salesOrders.api';
import { Badge, PriorityBadge, panelTones, stepTone, valueTones } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { StageMenu } from '../components/ui/StageMenu';
import { useAuth } from '../context/AuthContext';
import { ArtworkButton } from '../components/register/ArtworkButton';
import { MyTasksPanel } from '../components/tasks/MyTasksPanel';
import { tasksApi } from '../api/tasks.api';
import { stageJobKey, TASKS_CHANGED_EVENT } from '../lib/tasks';
import { useFloorWorker, usePermission } from '../hooks/usePermission';
import { useTaskSummary } from '../hooks/useTaskSummary';
import {
  PRODUCTION_STAGES,
  PRODUCTION_VIEW_KEYS,
  canSeeCommercial,
  canViewAnalytics,
  canViewSalesOrders,
  formatDate,
  formatMoney,
  formatQty,
  statusLabel,
} from '../lib/sales';

const DONE_LABEL = {
  rolling: 'Rolled',
  printing: 'Printed',
  cutting: 'Cut',
  dispatch: 'Dispatched',
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
    if (can('production:read')) return PRODUCTION_STAGES;
    return PRODUCTION_STAGES.filter((item) => can(item.read));
  }, [can]);
  const [stage, setStage] = useState('');
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const taskSummary = useTaskSummary();
  const { user } = useAuth();
  const [jobTasks, setJobTasks] = useState({});

  useEffect(() => {
    if (!can('tasks:read')) return undefined;
    let alive = true;
    const load = () =>
      tasksApi
        .list({ scope: 'inbox', category: 'stage_work' })
        .then((list) => alive && setJobTasks(Object.fromEntries(list.map((task) => [stageJobKey(task), task]))))
        .catch(() => alive && setJobTasks({}));
    load();
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(TASKS_CHANGED_EVENT, load);
    };
  }, [can]);

  useEffect(() => {
    if (!stages.length) return;
    const requested = searchParams.get('stage');
    const next = stages.some((item) => item.id === requested) ? requested : stages[0].id;
    setStage(next);
  }, [searchParams, stages]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stage) return undefined;
    let alive = true;
    setError('');
    setJobs([]);
    setLoading(true);
    productionApi
      .queue(stage)
      .then((data) => alive && setJobs(data.jobs || []))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [stage]);

  if (!stages.length) return null;

  function openJob(job) {
    navigate(`/registers?stage=${stage}&job=${encodeURIComponent(job.id)}`);
  }

  return (
    <section className="-mx-3 -my-3 flex h-[calc(100dvh-3rem)] min-h-0 flex-col sm:-mx-5 sm:-my-4 lg:-mx-6 lg:h-dvh">
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
        <div className="flex items-center gap-3">
          {taskSummary ? (
            <Link
              to="/tasks?scope=inbox"
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                taskSummary.overdue ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-line bg-white text-ink'
              }`}
            >
              My tasks {taskSummary.total}
              {taskSummary.overdue ? ` · ${taskSummary.overdue} overdue` : ''}
            </Link>
          ) : null}
          <p className="text-sm font-semibold text-ink">{jobs.length}</p>
        </div>
      </div>
      {error ? <p className="px-4 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-auto bg-card">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm lg:min-w-0 lg:table-fixed">
          <thead className="sticky top-0 z-10 bg-ink text-paper">
            <tr>
              <th className="px-3 py-2 font-semibold">Order</th>
              <th className="px-3 py-2 font-semibold">Customer code</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              {stage === 'printing' ? <th className="px-3 py-2 font-semibold">Artwork</th> : null}
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
                  <td className="px-3 py-2 font-normal">{job.customerCode || '—'}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{job.product}</p>
                    {job.requirements?.size ? <p className="text-sm font-normal text-slate">{job.requirements.size}</p> : null}
                  </td>
                  {stage === 'printing' ? (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate font-normal">
                          {job.requirements?.printing?.artwork || job.requirements?.printing?.design || '—'}
                        </span>
                        <ArtworkButton orderId={job.orderId} itemId={job.itemId} />
                      </div>
                    </td>
                  ) : null}
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
                    {(() => {
                      const task = jobTasks[job.id];
                      if (!task) return null;
                      const mine = task.assignee && String(task.assignee) === String(user?.id);
                      return (
                        <p className={`mt-1 text-xs font-semibold ${mine ? 'text-accent' : 'text-slate'} ${task.overdue ? 'text-red-700' : ''}`}>
                          {mine ? 'Your task' : task.assigneeName ? `Taken by ${task.assigneeName}` : 'Team task'}
                          {task.overdue ? ' · overdue' : ''}
                        </p>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading ? <p className="px-4 py-3 text-sm text-slate">Loading…</p> : null}
        {!loading && jobs.length === 0 && !error ? (
          <EmptyState title="No orders" hint="Orders appear here when this station has work." />
        ) : null}
      </div>
    </section>
  );
}

const outlineLink =
  'inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper';

function ymd(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function formatPct(value) {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}

function trend(value, suffix = '%') {
  if (value == null) return 'vs previous 7 days: —';
  return `${value > 0 ? '+' : ''}${value}${suffix} vs previous 7 days`;
}

function MetricCard({ label, value, hint, tone = 'muted', to }) {
  const body = (
    <>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueTones[tone]}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-sm font-normal text-slate">{hint}</p> : null}
    </>
  );
  const className = `rounded-xl border px-4 py-3 ${panelTones[tone]}`;
  return to ? (
    <Link to={to} className={`${className} transition hover:brightness-95`}>
      {body}
    </Link>
  ) : (
    <section className={className}>{body}</section>
  );
}

function OperationsOverview({ showMoney, canOpenOrder }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const end = new Date();
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    analyticsApi
      .get({ from: ymd(start), to: ymd(end) })
      .then((payload) => alive && setData(payload))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>;
  if (!data) return <p className="text-sm text-slate">Loading operations…</p>;

  const kpis = data.kpis || {};
  const previous = kpis.previous || {};
  const attention = (data.orders || []).filter((row) => row.overdue || row.atRisk).slice(0, 8);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Last 7 days</h2>
        <Link to="/analytics" className="text-sm font-semibold text-accent hover:underline">
          Full analytics
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Production output" value={kpis.outputText || formatQty(kpis.output)} hint={trend(previous.outputDelta)} tone="success" to="/analytics" />
        <MetricCard label="Waste rate" value={formatPct(kpis.wastePct)} hint={trend(previous.wastePctDelta, ' pts')} tone="warning" to="/analytics" />
        <MetricCard label="Yield" value={formatPct(kpis.yieldPct)} hint={trend(previous.yieldDelta, ' pts')} tone="info" to="/analytics" />
        <MetricCard label="Dispatched" value={kpis.dispatchedText || formatQty(kpis.dispatched)} hint={trend(previous.dispatchedDelta)} tone="teal" to="/analytics" />
        <MetricCard
          label="On-time delivery"
          value={formatPct(kpis.onTimePct)}
          hint={`${kpis.delivered || 0} delivered · ${kpis.late || 0} late`}
          tone={kpis.onTimePct != null && kpis.onTimePct < 80 ? 'warning' : 'success'}
          to="/analytics"
        />
        <MetricCard
          label="Open orders"
          value={kpis.openOrders ?? 0}
          hint={showMoney && kpis.openValue != null ? `${formatMoney(kpis.openValue)} in hand` : `${kpis.booked || 0} booked this week`}
          tone="accent"
          to={canOpenOrder ? '/sales-orders' : undefined}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-line bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
            <h3 className="font-semibold">Orders needing attention</h3>
            <p className="text-sm font-normal text-slate">
              <span className="font-semibold text-rose-700">{kpis.overdue || 0} overdue</span> ·{' '}
              <span className="font-semibold text-amber-700">{kpis.atRisk || 0} due in 3 days</span>
            </p>
          </div>
          {attention.length ? (
            <ul className="divide-y divide-line">
              {attention.map((row) => {
                const body = (
                  <>
                    <div className="min-w-0">
                      <p className="font-semibold">{row.number}</p>
                      <p className="truncate text-sm font-normal text-slate">
                        {row.customer || '—'} · {statusLabel(row.status)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={row.overdue ? 'danger' : 'warning'}>{row.overdue ? 'Overdue' : 'At risk'}</Badge>
                      <p className="mt-0.5 text-sm font-normal text-slate">Due {formatDate(row.deliveryDate)}</p>
                    </div>
                  </>
                );
                return (
                  <li key={row.id}>
                    {canOpenOrder ? (
                      <Link to={`/sales-orders/${row.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-paper/70">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-4 py-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm font-normal text-slate">No open orders are overdue or due in the next 3 days.</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-card">
          <div className="border-b border-line px-4 py-2">
            <h3 className="font-semibold">Stage output</h3>
          </div>
          <ul className="divide-y divide-line">
            {(data.byStage || []).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <Badge tone={stepTone(row.id)}>{row.label}</Badge>
                <div className="text-right">
                  <p className="font-semibold">{row.outputText || formatQty(row.output)}</p>
                  <p className="text-sm font-normal text-slate">
                    {formatPct(row.yieldPct)} yield · {row.entries} entries
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AdminDashboard() {
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

  const salesCards = [
    { label: 'Draft', status: 'draft', tone: 'muted' },
    { label: 'Submitted', status: 'submitted', tone: 'warning' },
    { label: 'Approved', status: 'approved', tone: 'info' },
    { label: 'Production planned', status: 'production_planned', tone: 'accent' },
    { label: 'In production', status: 'in_production', tone: 'accent' },
    { label: 'Ready for dispatch', status: 'ready_for_dispatch', tone: 'teal' },
    { label: 'Dispatched', status: 'dispatched', tone: 'teal' },
    { label: 'Delivered', status: 'delivered', tone: 'success' },
    { label: 'Completed', status: 'completed', tone: 'success' },
    { label: 'Cancelled', status: 'cancelled', tone: 'danger' },
  ].map((card) => ({ ...card, value: summary?.[card.status] ?? 0, to: `/sales-orders?status=${card.status}` }));

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
        <div className="px-1">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm font-normal text-slate">
            {user?.fullName || user?.username || ''}
            {user?.role?.name ? ` · ${user.role.name}` : ''}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {can('sales:read') ? (
            <Link to="/customers" className={outlineLink}>
              Customers
            </Link>
          ) : null}
          {showSales ? (
            <Link to="/sales-orders" className={outlineLink}>
              Orders
            </Link>
          ) : null}
          {showAnalytics ? (
            <Link to="/analytics" className={outlineLink}>
              Analytics
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

      {showAnalytics ? <OperationsOverview showMoney={showMoney} canOpenOrder={showSales} /> : null}

      {can('tasks:read') ? <MyTasksPanel /> : null}

      {!hasLinks ? <p className="text-sm font-normal text-slate">No extra pages for this role yet.</p> : null}

      {showSales ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Order pipeline</h2>
            <p className="text-sm font-normal text-slate">{summary?.total ?? 0} orders</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
  const floorWorker = useFloorWorker();
  if (floorWorker) return <Navigate to={can('tasks:read') ? '/tasks' : '/registers'} replace />;
  const floorOnly =
    user?.role?.slug !== 'super_admin' &&
    !can('sales:read') &&
    !can('users:read') &&
    PRODUCTION_VIEW_KEYS.some((key) => can(key));

  if (floorOnly) return <FloorDashboard />;
  return <AdminDashboard />;
}
