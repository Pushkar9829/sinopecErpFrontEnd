import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analytics.api';
import { BarChart, CHART_COLORS, StackedBarChart } from '../components/charts/BarChart';
import { Badge, StatusBadge, panelTones, stepTone, valueTones } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Section } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { StageMenu } from '../components/ui/StageMenu';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';
import {
  PRODUCTION_STAGES,
  canSeeCommercial,
  canViewSalesOrders,
  formatDate,
  formatMoney,
  formatQty,
  stageLabel,
  statusLabel,
} from '../lib/sales';

const RANGES = [
  { id: '7', label: 'Last 7 days' },
  { id: '14', label: 'Last 14 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'custom', label: 'Custom dates' },
];

const TONE_CHIPS = {
  muted: { chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  accent: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  info: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  purple: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  teal: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  success: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  warning: { chip: 'border-amber-300 bg-amber-100 text-amber-900', dot: 'bg-amber-500' },
  danger: { chip: 'border-rose-300 bg-rose-100 text-rose-800', dot: 'bg-rose-600' },
};

const VIEWS = [
  { id: 'overview', label: 'Overview', tone: 'accent' },
  { id: 'operators', label: 'Operators', tone: 'info' },
  { id: 'stages', label: 'Stages & machines', tone: 'purple' },
  { id: 'products', label: 'Products', tone: 'success' },
  { id: 'customers', label: 'Customers', tone: 'info' },
  { id: 'orders', label: 'Orders', tone: 'teal' },
  { id: 'waste', label: 'Waste', tone: 'warning' },
];

const ORDER_TYPE_OPTIONS = [
  { id: 'all', label: 'All order types', tone: 'muted' },
  { id: 'sales_order', label: 'Sales orders', tone: 'accent' },
  { id: 'job_work', label: 'Job work', tone: 'purple' },
];

const ORDER_FILTERS = [
  { id: 'all', label: 'All', tone: 'muted' },
  { id: 'overdue', label: 'Overdue', tone: 'danger' },
  { id: 'at_risk', label: 'At risk', tone: 'warning' },
  { id: 'open', label: 'Open', tone: 'accent' },
  { id: 'delivered', label: 'Delivered', tone: 'success' },
];

const EMPTY_FILTERS = { stage: 'all', orderType: 'all', customer: 'all', product: 'all', operator: 'all', machine: 'all' };

function ymd(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(value, amount) {
  const date = new Date(`${value}T12:00:00+05:30`);
  date.setDate(date.getDate() + amount);
  return ymd(date);
}

function rangeBounds(preset, customFrom, customTo) {
  const today = ymd(new Date());
  if (['7', '14', '30', '90'].includes(preset)) return { from: addDays(today, 1 - Number(preset)), to: today };
  if (preset === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (preset === 'lastMonth') {
    const lastDay = addDays(`${today.slice(0, 7)}-01`, -1);
    return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
  }
  return { from: customFrom || addDays(today, -29), to: customTo || today };
}

function shortDate(value) {
  if (!value) return '—';
  const [, month, day] = String(value).split('-');
  return `${day}/${month}`;
}

function formatPct(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}

function formatDelta(value, suffix = '%') {
  if (value == null) return 'No earlier data to compare';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix} vs previous period`;
}

function outputLabel(row) {
  return row?.outputText || formatQty(row?.output);
}

function wasteLabel(row) {
  return row?.wasteText || formatQty(row?.waste);
}

function perDayLabel(row) {
  return `${formatQty(row?.perDay)} ${row?.outputUnit || ''}`.trim();
}

function stageColor(id) {
  return CHART_COLORS[id] || CHART_COLORS.muted;
}

function filterOptions(list = [], allLabel, value, tone) {
  const options = [{ id: 'all', label: allLabel, tone: 'muted' }, ...list.map((item) => ({ ...item, tone }))];
  if (value !== 'all' && !options.some((item) => item.id === value)) options.push({ id: value, label: value, count: 0, tone });
  return options;
}

function ChipMenu({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.id === value) || options[0];
  const tone = TONE_CHIPS[current?.tone] || TONE_CHIPS.muted;

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (!current) return null;

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex max-w-64 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${tone.chip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <span className="truncate">
          {current.label}
          {current.count != null ? ` · ${current.count}` : ''}
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 max-h-80 w-64 overflow-auto rounded-lg border border-line bg-white p-1 shadow-md">
          {options.map((item) => {
            const itemTone = TONE_CHIPS[item.tone] || TONE_CHIPS.muted;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  item.id === value ? itemTone.chip : 'text-ink hover:bg-paper'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${itemTone.dot}`} />
                <span className="flex-1 truncate font-semibold">{item.label}</span>
                {item.count != null ? <span className="text-xs font-normal">{item.count}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm font-normal text-slate">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Kpi({ label, value, hint, tone = 'muted', onClick }) {
  const className = `rounded-xl border px-4 py-3 text-left ${panelTones[tone]} ${onClick ? 'cursor-pointer hover:brightness-95' : ''}`;
  const body = (
    <>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueTones[tone]}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-sm font-normal text-slate">{hint}</p> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <section className={className}>{body}</section>;
}

function DataTable({ columns, rows, empty, resetKey, onRowClick }) {
  const list = usePagedList(rows, { pageSize: 8, resetKey });
  if (!rows.length) {
    return empty || <EmptyState title="Nothing to show" />;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.paged.map((row, index) => (
              <tr
                key={row.id || row.key || index}
                className={`border-t border-line ${onRowClick ? 'cursor-pointer hover:bg-paper/70 focus:bg-paper/70 focus:outline-none' : ''}`}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 font-normal ${column.align === 'right' ? 'text-right' : ''}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={list.page}
        totalPages={list.totalPages}
        total={list.total}
        pageSize={list.pageSize}
        onPage={list.setPage}
      />
    </div>
  );
}

function StageBadges({ stages = [] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {stages.map((id) => (
        <Badge key={id} tone={stepTone(id)}>
          {stageLabel(id)}
        </Badge>
      ))}
    </div>
  );
}

const PERFORMANCE_COLUMNS = [
  { key: 'entries', label: 'Entries', align: 'right' },
  { key: 'activeDays', label: 'Active days', align: 'right' },
  { key: 'output', label: 'Output', align: 'right', render: outputLabel },
  { key: 'perDay', label: 'Per day', align: 'right', render: perDayLabel },
  { key: 'yieldPct', label: 'Yield', align: 'right', render: (row) => formatPct(row.yieldPct) },
  { key: 'waste', label: 'Waste', align: 'right', render: (row) => (row.waste ? `${wasteLabel(row)} · ${formatPct(row.wastePct)}` : '—') },
];

function WorkTable({ rows, canOpenOrder, onClose }) {
  const columns = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'order',
      label: 'Order',
      render: (row) => (
        <div>
          {canOpenOrder ? (
            <Link to={`/sales-orders/${row.orderId}`} className="font-semibold text-accent hover:underline" onClick={onClose}>
              {row.number}
            </Link>
          ) : (
            <p className="font-semibold">{row.number}</p>
          )}
          <p className="text-sm font-normal text-slate">{row.productCode || row.product}</p>
        </div>
      ),
    },
    { key: 'customer', label: 'Customer', render: (row) => row.customer || '—' },
    { key: 'stage', label: 'Stage', render: (row) => <Badge tone={stepTone(row.stage)}>{row.stageLabel}</Badge> },
    { key: 'operator', label: 'Operator', render: (row) => row.operator || '—' },
    { key: 'machine', label: 'Machine', render: (row) => row.machine || '—' },
    { key: 'output', label: 'Output', align: 'right', render: (row) => `${formatQty(row.output)} ${row.unit || ''}`.trim() },
    {
      key: 'waste',
      label: 'Waste',
      align: 'right',
      render: (row) => (row.waste ? `${formatQty(row.waste)} ${row.wasteUnit || ''}`.trim() : formatQty(0)),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      resetKey={rows.map((row) => `${row.orderId}-${row.date}-${row.stage}`).join('|')}
      empty={<EmptyState title="No register entries in this view" hint="Try a wider date range or clear a filter." />}
    />
  );
}

export function Analytics() {
  const { can } = usePermission();
  const showMoney = canSeeCommercial(can);
  const canOpenOrder = canViewSalesOrders(can);
  const [preset, setPreset] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tab, setTab] = useState('overview');
  const [orderTab, setOrderTab] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);

  const bounds = useMemo(() => rangeBounds(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    analyticsApi
      .get({ from: bounds.from, to: bounds.to, ...JSON.parse(filterKey) })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bounds.from, bounds.to, filterKey]);

  function changeTab(next) {
    setTab(next);
    setSearch('');
  }

  function setFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const activeFilters = Object.entries(filters).filter(([, value]) => value !== 'all').length;
  const kpis = data?.kpis || {};
  const previous = kpis.previous || {};
  const options = data?.options || {};
  const details = useMemo(() => data?.details || [], [data]);
  const q = search.trim().toLowerCase();
  const matches = (...values) => !q || values.some((value) => String(value || '').toLowerCase().includes(q));

  const drillRows = useMemo(() => {
    if (!drill) return [];
    const test = {
      operator: (row) => row.operator === drill.key,
      stage: (row) => row.stage === drill.key,
      date: (row) => row.date === drill.key,
      order: (row) => row.orderId === drill.key,
      product: (row) => (row.productCode || row.product) === drill.key,
      machine: (row) => row.machine === drill.key,
      customer: (row) => row.customerId === drill.key,
    }[drill.type];
    return test ? details.filter(test) : details;
  }, [details, drill]);

  const daily = (data?.byDate || []).map((row) => ({ ...row, label: shortDate(row.date) }));
  const stageBars = (data?.byStage || []).map((row) => ({ ...row, color: stageColor(row.id), value: row.output }));
  const operatorBars = (data?.byOperator || []).slice(0, 10).map((row) => ({ ...row, label: row.name.split(' ')[0], value: row.output }));
  const productBars = (data?.byProduct || []).slice(0, 10).map((row) => ({ ...row, label: row.code, value: row.output }));
  const customerBars = (data?.byCustomer || []).slice(0, 8).map((row) => ({ ...row, label: row.name.split(' ')[0], value: row.output }));
  const wasteBars = (data?.waste?.byStage || []).map((row) => ({ ...row, color: CHART_COLORS.waste, value: row.waste }));

  const operators = (data?.byOperator || []).filter((row) => matches(row.name));
  const products = (data?.byProduct || []).filter((row) => matches(row.code, row.name));
  const customers = (data?.byCustomer || []).filter((row) => matches(row.name));
  const machines = data?.byMachine || [];
  const wasteLots = (data?.waste?.inventory || []).filter((lot) => matches(lot.name, lot.stage, lot.kind, lot.unit));

  const allOrders = data?.orders || [];
  const orderTest = {
    all: () => true,
    overdue: (row) => row.overdue,
    at_risk: (row) => row.atRisk,
    open: (row) => !row.delivered,
    delivered: (row) => row.delivered,
  };
  const orderCounts = Object.fromEntries(ORDER_FILTERS.map((item) => [item.id, allOrders.filter(orderTest[item.id]).length]));
  const orders = allOrders.filter((row) => orderTest[orderTab](row) && matches(row.number, row.customer, statusLabel(row.status)));

  const views = VIEWS.map((item) => {
    const count = {
      operators: data?.byOperator?.length,
      stages: data?.byStage?.length,
      products: data?.byProduct?.length,
      customers: data?.byCustomer?.length,
      orders: allOrders.length,
      waste: data?.waste?.inventory?.length,
    }[item.id];
    return count == null ? item : { ...item, count };
  });
  const ranges = RANGES.map((item) => ({ ...item, tone: 'muted' }));
  const stages = [{ id: 'all', label: 'All stages' }, ...PRODUCTION_STAGES.filter((item) => item.id !== 'dispatch')];

  function openOrders(id) {
    changeTab('orders');
    setOrderTab(id);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-line bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="px-1 text-lg font-semibold">Analytics</h1>
          <ChipMenu label="View" value={tab} options={views} onChange={changeTab} />
          <ChipMenu label="Range" value={preset} options={ranges} onChange={setPreset} />
          {preset === 'custom' ? (
            <>
              <input
                type="date"
                aria-label="From"
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-normal text-ink outline-none focus:border-accent"
                value={customFrom || bounds.from}
                max={customTo || bounds.to}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
              <input
                type="date"
                aria-label="To"
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-normal text-ink outline-none focus:border-accent"
                value={customTo || bounds.to}
                min={customFrom || bounds.from}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </>
          ) : null}
          <p className="ml-auto text-sm font-normal text-slate">
            {loading ? 'Updating…' : `${formatDate(bounds.from)} – ${formatDate(bounds.to)}`}
            {data?.previousFrom && !loading ? ` · compared with ${formatDate(data.previousFrom)} – ${formatDate(data.previousTo)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <span className="px-1 text-sm font-semibold text-slate">Filters</span>
          <StageMenu stages={stages} value={filters.stage} onChange={(value) => setFilter('stage', value)} />
          <ChipMenu label="Order type" value={filters.orderType} options={ORDER_TYPE_OPTIONS} onChange={(value) => setFilter('orderType', value)} />
          <ChipMenu
            label="Customer"
            value={filters.customer}
            options={filterOptions(options.customers, 'All customers', filters.customer, 'info')}
            onChange={(value) => setFilter('customer', value)}
          />
          <ChipMenu
            label="Product"
            value={filters.product}
            options={filterOptions(options.products, 'All products', filters.product, 'success')}
            onChange={(value) => setFilter('product', value)}
          />
          <ChipMenu
            label="Operator"
            value={filters.operator}
            options={filterOptions(options.operators, 'All operators', filters.operator, 'info')}
            onChange={(value) => setFilter('operator', value)}
          />
          {(options.machines || []).length || filters.machine !== 'all' ? (
            <ChipMenu
              label="Machine"
              value={filters.machine}
              options={filterOptions(options.machines, 'All machines', filters.machine, 'purple')}
              onChange={(value) => setFilter('machine', value)}
            />
          ) : null}
          {activeFilters ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-lg px-2 py-1.5 text-sm font-semibold text-accent hover:underline"
            >
              Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {loading && !data ? <p className="text-sm text-slate">Loading analytics…</p> : null}

      {tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Production output"
              value={outputLabel(kpis)}
              hint={formatDelta(previous.outputDelta)}
              tone="success"
              onClick={() => changeTab('stages')}
            />
            <Kpi
              label="Waste rate"
              value={formatPct(kpis.wastePct)}
              hint={`${wasteLabel(kpis)} · ${formatDelta(previous.wastePctDelta, ' pts')}`}
              tone="warning"
              onClick={() => changeTab('waste')}
            />
            <Kpi
              label="Yield"
              value={formatPct(kpis.yieldPct)}
              hint={`Output ÷ input · ${formatDelta(previous.yieldDelta, ' pts')}`}
              tone="info"
            />
            <Kpi
              label="Dispatched"
              value={kpis.dispatchedText || formatQty(kpis.dispatched)}
              hint={formatDelta(previous.dispatchedDelta)}
              tone="teal"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi
              label="Delivered orders"
              value={kpis.delivered ?? 0}
              hint={showMoney && kpis.deliveredValue != null ? formatMoney(kpis.deliveredValue) : formatDelta(previous.deliveredDelta)}
              tone="success"
              onClick={() => openOrders('delivered')}
            />
            <Kpi
              label="On-time delivery"
              value={formatPct(kpis.onTimePct)}
              hint={`${kpis.onTime || 0} on time · ${kpis.late || 0} late`}
              tone={kpis.onTimePct != null && kpis.onTimePct < 80 ? 'warning' : 'success'}
              onClick={() => openOrders('delivered')}
            />
            <Kpi
              label="Avg lead time"
              value={kpis.avgLeadDays != null ? `${formatQty(kpis.avgLeadDays)} days` : '—'}
              hint="Order date to delivery"
              tone="muted"
            />
            <Kpi
              label="Open orders"
              value={kpis.openOrders ?? 0}
              hint={showMoney && kpis.openValue != null ? `${formatMoney(kpis.openValue)} in hand` : `${kpis.booked || 0} booked in range`}
              tone="accent"
              onClick={() => openOrders('open')}
            />
            <Kpi
              label="Overdue · At risk"
              value={`${kpis.overdue ?? 0} · ${kpis.atRisk ?? 0}`}
              hint="Past due · due within 3 days"
              tone={kpis.overdue ? 'danger' : 'warning'}
              onClick={() => openOrders(kpis.overdue ? 'overdue' : 'at_risk')}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Section
              title="Daily output vs waste"
              actions={<Legend items={[{ label: 'Output', color: CHART_COLORS.output }, { label: 'Waste', color: CHART_COLORS.waste }]} />}
            >
              <StackedBarChart
                data={daily}
                onBarClick={(row) => setDrill({ type: 'date', key: row.date, title: formatDate(row.date) })}
              />
              <p className="mt-2 text-sm font-normal text-slate">
                {kpis.entries || 0} register entries over {kpis.activeDays || 0} working days · {perDayLabel(kpis)} per day ·{' '}
                {kpis.operators || 0} operators · {kpis.ordersWorked || 0} orders
              </p>
            </Section>
            <div className="grid gap-4">
              <Section title="By stage">
                <BarChart data={stageBars} onBarClick={(row) => setDrill({ type: 'stage', key: row.id, title: row.label })} />
              </Section>
              <Section title="Top customers">
                {customerBars.length ? (
                  <BarChart
                    data={customerBars}
                    color={CHART_COLORS.printing}
                    onBarClick={(row) => setDrill({ type: 'customer', key: row.id, title: row.name })}
                  />
                ) : (
                  <p className="text-sm text-slate">No customer work in this range.</p>
                )}
              </Section>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'operators' ? (
        <Section
          title="Operator performance"
          actions={<SearchField value={search} onChange={setSearch} placeholder="Search operator" className="w-48" />}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <DataTable
              resetKey={`${search}|${operators.map((row) => row.name).join('|')}`}
              empty={<EmptyState title="No operator work in this range" />}
              onRowClick={(row) => setDrill({ type: 'operator', key: row.name, title: row.name })}
              rows={operators.map((row) => ({ ...row, id: row.name }))}
              columns={[
                { key: 'name', label: 'Operator', render: (row) => <span className="font-semibold">{row.name}</span> },
                { key: 'stages', label: 'Stages', render: (row) => <StageBadges stages={row.stages} /> },
                ...PERFORMANCE_COLUMNS,
              ]}
            />
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="mb-2 text-sm font-semibold text-ink">Top output</p>
              <BarChart
                data={operatorBars}
                color={CHART_COLORS.printing}
                onBarClick={(row) => setDrill({ type: 'operator', key: row.name, title: row.name })}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {tab === 'stages' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(data?.byStage || []).map((row) => (
              <Kpi
                key={row.id}
                label={row.label}
                value={outputLabel(row)}
                hint={`${formatPct(row.yieldPct)} yield · ${perDayLabel(row)} per day · ${row.entries} entries`}
                tone={stepTone(row.id)}
                onClick={() => setDrill({ type: 'stage', key: row.id, title: row.label })}
              />
            ))}
          </div>
          <Section
            title="Output vs waste by stage"
            actions={<Legend items={[{ label: 'Output', color: CHART_COLORS.output }, { label: 'Waste', color: CHART_COLORS.waste }]} />}
          >
            <StackedBarChart data={stageBars} onBarClick={(row) => setDrill({ type: 'stage', key: row.id, title: row.label })} />
          </Section>
          <Section title="Machines">
            <DataTable
              resetKey={machines.map((row) => row.name).join('|')}
              empty={<EmptyState title="No machine recorded on entries in this range" />}
              onRowClick={(row) => setDrill({ type: 'machine', key: row.name, title: row.name })}
              rows={machines.map((row) => ({ ...row, id: row.name }))}
              columns={[
                { key: 'name', label: 'Machine', render: (row) => <span className="font-semibold">{row.name}</span> },
                { key: 'stages', label: 'Stage', render: (row) => <StageBadges stages={row.stages} /> },
                ...PERFORMANCE_COLUMNS,
              ]}
            />
          </Section>
        </div>
      ) : null}

      {tab === 'products' ? (
        <Section
          title="Product performance"
          actions={<SearchField value={search} onChange={setSearch} placeholder="Search code or name" className="w-52" />}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <DataTable
              resetKey={`${search}|${products.map((row) => row.code).join('|')}`}
              empty={<EmptyState title="No product work in this range" />}
              onRowClick={(row) => setDrill({ type: 'product', key: row.code, title: row.name || row.code })}
              rows={products.map((row) => ({ ...row, id: row.code }))}
              columns={[
                {
                  key: 'code',
                  label: 'Product',
                  render: (row) => (
                    <div>
                      <p className="font-semibold">{row.code}</p>
                      {row.name && row.name !== row.code ? <p className="text-sm font-normal text-slate">{row.name}</p> : null}
                    </div>
                  ),
                },
                { key: 'orderCount', label: 'Orders', align: 'right' },
                ...PERFORMANCE_COLUMNS,
              ]}
            />
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="mb-2 text-sm font-semibold text-ink">Top output</p>
              <BarChart
                data={productBars}
                color={CHART_COLORS.cutting}
                onBarClick={(row) => setDrill({ type: 'product', key: row.code, title: row.name || row.code })}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {tab === 'customers' ? (
        <Section
          title="Customer volume"
          actions={<SearchField value={search} onChange={setSearch} placeholder="Search customer" className="w-48" />}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <DataTable
              resetKey={`${search}|${customers.map((row) => row.id).join('|')}`}
              empty={<EmptyState title="No customer work in this range" />}
              onRowClick={(row) => setDrill({ type: 'customer', key: row.id, title: row.name })}
              rows={customers}
              columns={[
                { key: 'name', label: 'Customer', render: (row) => <span className="font-semibold">{row.name}</span> },
                { key: 'orderCount', label: 'Orders', align: 'right' },
                { key: 'stages', label: 'Stages', render: (row) => <StageBadges stages={row.stages} /> },
                ...PERFORMANCE_COLUMNS.filter((column) => column.key !== 'perDay'),
              ]}
            />
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="mb-2 text-sm font-semibold text-ink">Top output</p>
              <BarChart
                data={customerBars}
                color={CHART_COLORS.printing}
                onBarClick={(row) => setDrill({ type: 'customer', key: row.id, title: row.name })}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {tab === 'orders' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Overdue" value={orderCounts.overdue} hint="Past delivery date, still open" tone="danger" onClick={() => setOrderTab('overdue')} />
            <Kpi label="At risk" value={orderCounts.at_risk} hint="Due within 3 days, still open" tone="warning" onClick={() => setOrderTab('at_risk')} />
            <Kpi
              label="Open"
              value={orderCounts.open}
              hint={showMoney && kpis.openValue != null ? formatMoney(kpis.openValue) : 'Not yet delivered'}
              tone="accent"
              onClick={() => setOrderTab('open')}
            />
            <Kpi
              label="Delivered in range"
              value={orderCounts.delivered}
              hint={`${formatPct(kpis.onTimePct)} on time${showMoney && kpis.deliveredValue != null ? ` · ${formatMoney(kpis.deliveredValue)}` : ''}`}
              tone="success"
              onClick={() => setOrderTab('delivered')}
            />
          </div>
          <Section
            title="Orders"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <ChipMenu
                  label="Order status"
                  value={orderTab}
                  options={ORDER_FILTERS.map((item) => ({ ...item, count: orderCounts[item.id] }))}
                  onChange={setOrderTab}
                />
                <SearchField value={search} onChange={setSearch} placeholder="Search order or customer" className="w-56" />
              </div>
            }
          >
            <DataTable
              resetKey={`${orderTab}|${search}`}
              empty={<EmptyState title="No matching orders" hint="Open orders and orders delivered in this range appear here." />}
              onRowClick={(row) => setDrill({ type: 'order', key: row.id, title: row.number })}
              rows={orders}
              columns={[
                {
                  key: 'number',
                  label: 'Order',
                  render: (row) => (
                    <div>
                      {canOpenOrder ? (
                        <Link to={`/sales-orders/${row.id}`} className="font-semibold text-accent hover:underline" onClick={(event) => event.stopPropagation()}>
                          {row.number}
                        </Link>
                      ) : (
                        <span className="font-semibold">{row.number}</span>
                      )}
                      <p className="text-sm font-normal text-slate">{row.orderType === 'job_work' ? 'Job work' : 'Sales order'}</p>
                    </div>
                  ),
                },
                { key: 'customer', label: 'Customer' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={row.status} label={statusLabel(row.status)} />
                      {row.overdue ? <Badge tone="danger">Overdue</Badge> : null}
                      {row.atRisk ? <Badge tone="warning">At risk</Badge> : null}
                      {row.onTime === true ? <Badge tone="success">On time</Badge> : null}
                      {row.onTime === false ? <Badge tone="warning">Late</Badge> : null}
                    </div>
                  ),
                },
                { key: 'orderDate', label: 'Ordered', render: (row) => formatDate(row.orderDate) },
                { key: 'deliveryDate', label: 'Due', render: (row) => formatDate(row.deliveryDate) },
                { key: 'completedAt', label: 'Delivered', render: (row) => (row.completedAt ? formatDate(row.completedAt) : '—') },
                ...(showMoney
                  ? [{ key: 'grandTotal', label: 'Value', align: 'right', render: (row) => formatMoney(row.grandTotal) }]
                  : []),
              ]}
            />
          </Section>
        </div>
      ) : null}

      {tab === 'waste' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Floor waste" value={wasteLabel(kpis)} hint="Logged with each register entry" tone="warning" />
            <Kpi label="Waste rate" value={formatPct(kpis.wastePct)} hint={formatDelta(previous.wastePctDelta, ' pts')} tone="warning" />
            <Kpi
              label="Waste in store"
              value={data?.waste?.inventoryText || formatQty(0)}
              hint={`${data?.waste?.inventory?.length || 0} lots in inventory`}
              tone="accent"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
            <Section title="By stage">
              <BarChart
                data={wasteBars}
                color={CHART_COLORS.waste}
                onBarClick={(row) => setDrill({ type: 'stage', key: row.id, title: `${row.label} waste` })}
              />
              <div className="mt-2 space-y-1 text-sm">
                {(data?.waste?.byStage || []).map((row) => (
                  <p key={row.id} className="flex justify-between gap-2">
                    <span className="font-semibold">{row.label}</span>
                    <span className="font-normal text-slate">
                      {row.wasteText || formatQty(row.waste)} · {formatPct(row.wastePct)}
                    </span>
                  </p>
                ))}
              </div>
            </Section>
            <Section
              title="Waste lots in store"
              actions={<SearchField value={search} onChange={setSearch} placeholder="Search lot or stage" className="w-48" />}
            >
              <DataTable
                resetKey={search}
                empty={<EmptyState title="No waste lots in inventory" />}
                rows={wasteLots}
                columns={[
                  { key: 'name', label: 'Lot', render: (row) => <span className="font-semibold">{row.name}</span> },
                  {
                    key: 'stage',
                    label: 'Stage',
                    render: (row) =>
                      row.stage ? <Badge tone={stepTone(row.stage)}>{stageLabel(row.stage) || row.stage}</Badge> : '—',
                  },
                  { key: 'kind', label: 'Kind', render: (row) => (row.kind === 'wip' ? 'Floor' : 'Catalog') },
                  { key: 'quantity', label: 'Qty', align: 'right', render: (row) => `${formatQty(row.quantity)} ${row.unit || ''}`.trim() },
                ]}
              />
            </Section>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(drill)}
        wide
        title={
          <div>
            <h2 className="text-lg font-semibold text-ink">{drill?.title || 'Register entries'}</h2>
            <p className="mt-0.5 text-sm text-slate">
              {drillRows.length} register entr{drillRows.length === 1 ? 'y' : 'ies'} in this range
            </p>
          </div>
        }
        onClose={() => setDrill(null)}
      >
        <WorkTable rows={drillRows} canOpenOrder={canOpenOrder} onClose={() => setDrill(null)} />
      </Modal>
    </div>
  );
}
