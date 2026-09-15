import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analytics.api';
import { BarChart, CHART_COLORS, StackedBarChart } from '../components/charts/BarChart';
import { Badge, StatusBadge, orderStatusTone, panelTones, stepTone, valueTones } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, inputClass, Section } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
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
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom dates' },
];

const ORDER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'at_risk', label: 'At risk', tone: 'danger' },
  { id: 'in_production', label: 'In production', tone: 'accent' },
  { id: 'dispatched', label: 'Dispatched', tone: 'teal' },
  { id: 'delivered', label: 'Delivered', tone: 'success' },
  { id: 'completed', label: 'Completed', tone: 'success' },
];

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
  if (preset === '7') return { from: addDays(today, -6), to: today };
  if (preset === '30') return { from: addDays(today, -29), to: today };
  if (preset === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (preset === 'custom') {
    return {
      from: customFrom || addDays(today, -13),
      to: customTo || today,
    };
  }
  return { from: addDays(today, -13), to: today };
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

function formatDelta(value) {
  if (value == null) return 'vs previous period';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}% vs previous`;
}

function stageColor(id) {
  return CHART_COLORS[id] || CHART_COLORS.muted;
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate">
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
  const className = `rounded-xl border p-3 ${panelTones[tone]} ${onClick ? 'cursor-pointer text-left hover:brightness-95' : ''}`;
  const body = (
    <>
      <p className="text-[11px] uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueTones[tone]}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate">{hint}</p> : null}
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
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-paper text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-3 py-2 ${column.align === 'right' ? 'text-right' : ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.paged.map((row, index) => (
              <tr
                key={row.id || row.key || index}
                className={`border-t border-line ${onRowClick ? 'cursor-pointer hover:bg-paper' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-2 ${column.align === 'right' ? 'text-right' : ''}`}>
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

function WorkTable({ rows, canOpenOrder, onClose }) {
  const columns = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'order',
      label: 'Order',
      render: (row) => (
        <div>
          {canOpenOrder ? (
            <Link to={`/sales-orders/${row.orderId}`} className="font-medium text-accent hover:underline" onClick={onClose}>
              {row.number}
            </Link>
          ) : (
            <p className="font-medium">{row.number}</p>
          )}
          <p className="text-xs text-slate">{row.productCode || row.product}</p>
        </div>
      ),
    },
    { key: 'stage', label: 'Stage', render: (row) => <Badge tone={stepTone(row.stage)}>{row.stageLabel}</Badge> },
    { key: 'operator', label: 'Operator' },
    { key: 'shift', label: 'Shift', render: (row) => row.shiftLabel },
    { key: 'output', label: 'Output', align: 'right', render: (row) => formatQty(row.output) },
    { key: 'waste', label: 'Waste', align: 'right', render: (row) => formatQty(row.waste) },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      resetKey={rows.map((row) => `${row.orderId}-${row.date}-${row.stage}`).join('|')}
      empty={<EmptyState title="No shifts in this view" hint="Try a wider date range or another filter." />}
    />
  );
}

export function Analytics() {
  const { can } = usePermission();
  const showMoney = canSeeCommercial(can);
  const canOpenOrder = canViewSalesOrders(can);
  const [preset, setPreset] = useState('14');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [stage, setStage] = useState('all');
  const [tab, setTab] = useState('overview');
  const [orderTab, setOrderTab] = useState('all');
  const [operatorQuery, setOperatorQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [wasteQuery, setWasteQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);

  const bounds = useMemo(() => rangeBounds(preset, customFrom, customTo), [preset, customFrom, customTo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    analyticsApi
      .get({ from: bounds.from, to: bounds.to, stage })
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
  }, [bounds.from, bounds.to, stage]);

  const details = data?.details || [];
  const drillRows = useMemo(() => {
    if (!drill) return [];
    if (drill.type === 'operator') return details.filter((row) => row.operator === drill.key);
    if (drill.type === 'stage') return details.filter((row) => row.stage === drill.key);
    if (drill.type === 'date') return details.filter((row) => row.date === drill.key);
    if (drill.type === 'shift') return details.filter((row) => row.shift === drill.key);
    if (drill.type === 'status') return details.filter((row) => row.status === drill.key);
    if (drill.type === 'order') return details.filter((row) => row.orderId === drill.key);
    if (drill.type === 'product') {
      return details.filter((row) => (row.productCode || row.product) === drill.key);
    }
    if (drill.type === 'machine') return details.filter((row) => row.machine === drill.key);
    return details;
  }, [details, drill]);

  const daily = (data?.byDate || []).map((row) => ({ ...row, label: shortDate(row.date) }));
  const stageBars = (data?.byStage || []).map((row) => ({
    ...row,
    label: row.label,
    color: stageColor(row.id),
    value: row.output,
  }));
  const operatorBars = (data?.byOperator || []).map((row) => ({
    ...row,
    label: row.name.split(' ')[0],
    value: row.output,
  }));
  const shiftBars = (data?.byShift || []).map((row) => ({
    ...row,
    label: row.label,
    color: stageColor(row.id),
    value: row.output,
  }));
  const wasteBars = (data?.waste?.byStage || []).map((row) => ({
    ...row,
    label: row.label,
    color: CHART_COLORS.waste,
    value: row.waste,
  }));

  const operators = useMemo(() => {
    const q = operatorQuery.trim().toLowerCase();
    return (data?.byOperator || []).filter((row) => !q || row.name.toLowerCase().includes(q));
  }, [data?.byOperator, operatorQuery]);

  const orders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return (data?.orders || []).filter((row) => {
      if (orderTab === 'at_risk' && !row.atRisk) return false;
      if (orderTab !== 'all' && orderTab !== 'at_risk' && row.status !== orderTab) return false;
      if (!q) return true;
      return [row.number, row.customer, statusLabel(row.status)].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [data?.orders, orderQuery, orderTab]);

  const wasteLots = useMemo(() => {
    const q = wasteQuery.trim().toLowerCase();
    return (data?.waste?.inventory || []).filter((lot) => {
      if (!q) return true;
      return [lot.name, lot.stage, lot.kind, lot.unit].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [data?.waste?.inventory, wasteQuery]);

  const products = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return (data?.byProduct || []).filter((row) => {
      if (!q) return true;
      return [row.code, row.name].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [data?.byProduct, productQuery]);

  const productBars = (data?.byProduct || []).map((row) => ({
    ...row,
    label: row.code,
    value: row.output,
  }));

  const tabs = [
    { id: 'overview', label: 'Overview', tone: 'accent' },
    { id: 'operators', label: 'Operators', count: data?.kpis?.operators, tone: 'info' },
    { id: 'stages', label: 'Stages', tone: 'purple' },
    { id: 'products', label: 'Products', count: data?.byProduct?.length, tone: 'info' },
    { id: 'orders', label: 'Orders', count: data?.orders?.length, tone: 'teal' },
    { id: 'waste', label: 'Waste', tone: 'warning' },
  ];

  const orderCounts = {
    all: data?.orders?.length || 0,
    in_production: (data?.orders || []).filter((row) => row.status === 'in_production').length,
    dispatched: (data?.orders || []).filter((row) => row.status === 'dispatched').length,
    delivered: (data?.orders || []).filter((row) => row.status === 'delivered').length,
    completed: (data?.orders || []).filter((row) => row.status === 'completed').length,
    at_risk: (data?.orders || []).filter((row) => row.atRisk).length,
  };

  function openDrill(next) {
    setDrill(next);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        subtitle={
          <>
            <span>
              {formatDate(bounds.from)} – {formatDate(bounds.to)}
            </span>
            <Badge tone={stage === 'all' ? 'muted' : stepTone(stage)}>
              {stage === 'all' ? 'All stages' : stageLabel(stage)}
            </Badge>
            {loading ? <span className="text-steel">Updating…</span> : null}
          </>
        }
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Range" className="w-40">
              <select className={inputClass} value={preset} onChange={(event) => setPreset(event.target.value)}>
                {RANGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            {preset === 'custom' ? (
              <>
                <Field label="From" className="w-36">
                  <input
                    type="date"
                    className={inputClass}
                    value={customFrom || bounds.from}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </Field>
                <Field label="To" className="w-36">
                  <input
                    type="date"
                    className={inputClass}
                    value={customTo || bounds.to}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Stage" className="w-40">
              <select className={inputClass} value={stage} onChange={(event) => setStage(event.target.value)}>
                <option value="all">All stages</option>
                {PRODUCTION_STAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        }
        extra={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
      />

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {loading && !data ? <p className="text-sm text-slate">Loading analytics…</p> : null}

      {tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Output"
              value={formatQty(data?.kpis?.output)}
              hint={formatDelta(data?.kpis?.previous?.outputDelta)}
              tone="success"
            />
            <Kpi
              label="Waste"
              value={`${formatQty(data?.kpis?.waste)} · ${data?.kpis?.wastePct || 0}%`}
              hint={formatDelta(data?.kpis?.previous?.wasteDelta)}
              tone="warning"
              onClick={() => setTab('waste')}
            />
            <Kpi
              label="Yield"
              value={formatPct(data?.kpis?.yieldPct)}
              hint={`Output ÷ input · ${formatQty(data?.kpis?.perShift)} / shift`}
              tone="info"
            />
            <Kpi
              label="Delivered"
              value={data?.kpis?.completed ?? 0}
              hint={
                showMoney && data?.kpis?.completedValue != null
                  ? `${formatMoney(data.kpis.completedValue)} · ${formatDelta(data?.kpis?.previous?.completedDelta)}`
                  : formatDelta(data?.kpis?.previous?.completedDelta)
              }
              tone="teal"
              onClick={() => setTab('orders')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Shifts" value={data?.kpis?.shifts ?? 0} hint={`${data?.kpis?.operators || 0} operators`} tone="muted" onClick={() => setTab('operators')} />
            <Kpi label="On time" value={data?.kpis?.onTime ?? 0} hint={`${data?.kpis?.late || 0} late vs delivery date`} tone="success" onClick={() => setTab('orders')} />
            <Kpi
              label="At risk"
              value={data?.kpis?.atRisk ?? 0}
              hint="Due in 3 days, still open"
              tone="danger"
              onClick={() => {
                setTab('orders');
                setOrderTab('at_risk');
              }}
            />
            <Kpi
              label="Products"
              value={data?.byProduct?.length ?? 0}
              hint="SKUs with work in range"
              tone="purple"
              onClick={() => setTab('products')}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Section
              title="Daily output vs waste"
              actions={<Legend items={[{ label: 'Output', color: CHART_COLORS.output }, { label: 'Waste', color: CHART_COLORS.waste }]} />}
            >
              <StackedBarChart
                data={daily}
                onBarClick={(row) => openDrill({ type: 'date', key: row.date, title: formatDate(row.date) })}
              />
              <p className="text-xs text-slate">Click a day to see its shifts.</p>
            </Section>
            <div className="grid gap-4">
              <Section title="By shift" actions={<p className="text-xs text-slate">Morning / afternoon / night</p>}>
                <BarChart data={shiftBars} onBarClick={(row) => openDrill({ type: 'shift', key: row.id, title: row.label })} />
              </Section>
              <Section title="By stage" actions={<p className="text-xs text-slate">Click a stage for detail</p>}>
                <BarChart
                  data={stageBars}
                  onBarClick={(row) => openDrill({ type: 'stage', key: row.id, title: row.label })}
                />
              </Section>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'operators' ? (
        <Section
          title="Operators"
          actions={<SearchField value={operatorQuery} onChange={setOperatorQuery} placeholder="Search operator" className="w-48" />}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <DataTable
              resetKey={`${operatorQuery}|${operators.map((row) => row.name).join('|')}`}
              empty={<EmptyState title="No operator work in this range" />}
              onRowClick={(row) => openDrill({ type: 'operator', key: row.name, title: row.name })}
              rows={operators.map((row) => ({ ...row, id: row.name }))}
              columns={[
                { key: 'name', label: 'Operator' },
                {
                  key: 'stages',
                  label: 'Stages',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1">
                      {row.stages.map((id) => (
                        <Badge key={id} tone={stepTone(id)}>
                          {stageLabel(id)}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                { key: 'shifts', label: 'Shifts', align: 'right' },
                { key: 'output', label: 'Output', align: 'right', render: (row) => formatQty(row.output) },
                { key: 'perShift', label: 'Per shift', align: 'right', render: (row) => formatQty(row.perShift) },
                { key: 'yieldPct', label: 'Yield', align: 'right', render: (row) => formatPct(row.yieldPct) },
                { key: 'waste', label: 'Waste', align: 'right', render: (row) => formatQty(row.waste) },
              ]}
            />
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-steel">Output</p>
              <BarChart
                data={operatorBars}
                color={CHART_COLORS.printing}
                onBarClick={(row) => openDrill({ type: 'operator', key: row.name, title: row.name })}
              />
              <p className="mt-2 text-xs text-slate">Click a row or bar for that operator’s shifts.</p>
            </div>
          </div>
        </Section>
      ) : null}

      {tab === 'stages' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.byStage || []).map((row) => (
              <Kpi
                key={row.id}
                label={row.label}
                value={formatQty(row.output)}
                hint={`${row.shifts} shifts · ${formatPct(row.yieldPct)} yield`}
                tone={stepTone(row.id)}
                onClick={() => openDrill({ type: 'stage', key: row.id, title: row.label })}
              />
            ))}
          </div>
          <Section
            title="Output vs waste by stage"
            actions={<Legend items={[{ label: 'Output', color: CHART_COLORS.output }, { label: 'Waste', color: CHART_COLORS.waste }]} />}
          >
            <StackedBarChart
              data={stageBars}
              onBarClick={(row) => openDrill({ type: 'stage', key: row.id, title: row.label })}
            />
          </Section>
          {(data?.byMachine || []).length ? (
            <Section title="Machines">
              <DataTable
                resetKey={(data?.byMachine || []).map((row) => row.name).join('|')}
                onRowClick={(row) => openDrill({ type: 'machine', key: row.name, title: row.name })}
                rows={(data?.byMachine || []).map((row) => ({ ...row, id: row.name }))}
                columns={[
                  { key: 'name', label: 'Machine' },
                  {
                    key: 'stages',
                    label: 'Stage',
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        {(row.stages || []).map((id) => (
                          <Badge key={id} tone={stepTone(id)}>
                            {stageLabel(id)}
                          </Badge>
                        ))}
                      </div>
                    ),
                  },
                  { key: 'shifts', label: 'Shifts', align: 'right' },
                  { key: 'output', label: 'Output', align: 'right', render: (row) => formatQty(row.output) },
                  { key: 'yieldPct', label: 'Yield', align: 'right', render: (row) => formatPct(row.yieldPct) },
                ]}
              />
            </Section>
          ) : null}
        </div>
      ) : null}

      {tab === 'products' ? (
        <Section
          title="Products"
          actions={<SearchField value={productQuery} onChange={setProductQuery} placeholder="Search code or name" className="w-52" />}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <DataTable
              resetKey={`${productQuery}|${products.map((row) => row.code).join('|')}`}
              empty={<EmptyState title="No product work in this range" />}
              onRowClick={(row) => openDrill({ type: 'product', key: row.code, title: row.name || row.code })}
              rows={products.map((row) => ({ ...row, id: row.code }))}
              columns={[
                {
                  key: 'code',
                  label: 'Product',
                  render: (row) => (
                    <div>
                      <p className="font-medium">{row.code}</p>
                      <p className="text-xs text-slate">{row.name}</p>
                    </div>
                  ),
                },
                { key: 'shifts', label: 'Shifts', align: 'right' },
                { key: 'output', label: 'Output', align: 'right', render: (row) => formatQty(row.output) },
                { key: 'waste', label: 'Waste', align: 'right', render: (row) => formatQty(row.waste) },
                { key: 'yieldPct', label: 'Yield', align: 'right', render: (row) => formatPct(row.yieldPct) },
              ]}
            />
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-steel">Output</p>
              <BarChart
                data={productBars}
                color={CHART_COLORS.cutting}
                onBarClick={(row) => openDrill({ type: 'product', key: row.code, title: row.name || row.code })}
              />
              <p className="mt-2 text-xs text-slate">Click a SKU to see its shifts.</p>
            </div>
          </div>
        </Section>
      ) : null}

      {tab === 'orders' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="At risk"
              value={orderCounts.at_risk}
              hint="Due in 3 days, still open"
              tone="danger"
              onClick={() => setOrderTab('at_risk')}
            />
            {['in_production', 'dispatched', 'delivered', 'completed'].map((id) => (
              <Kpi
                key={id}
                label={statusLabel(id)}
                value={orderCounts[id]}
                hint={
                  showMoney
                    ? formatMoney((data?.byStatus || []).find((row) => row.id === id)?.value)
                    : 'Open this list'
                }
                tone={orderStatusTone(id)}
                onClick={() => setOrderTab(id)}
              />
            ))}
          </div>
          <Section
            title="Floor orders"
            actions={<SearchField value={orderQuery} onChange={setOrderQuery} placeholder="Search order or customer" className="w-56" />}
          >
            <Tabs
              tabs={ORDER_TABS.map((item) => ({ ...item, count: orderCounts[item.id] }))}
              value={orderTab}
              onChange={setOrderTab}
            />
            <DataTable
              resetKey={`${orderTab}|${orderQuery}`}
              empty={<EmptyState title="No matching orders" hint="Delivered, dispatched, and in-production orders appear here." />}
              onRowClick={(row) => openDrill({ type: 'order', key: row.id, title: row.number })}
              rows={orders}
              columns={[
                {
                  key: 'number',
                  label: 'Order',
                  render: (row) =>
                    canOpenOrder ? (
                      <Link to={`/sales-orders/${row.id}`} className="font-medium text-accent hover:underline" onClick={(event) => event.stopPropagation()}>
                        {row.number}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.number}</span>
                    ),
                },
                { key: 'customer', label: 'Customer' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={row.status} label={statusLabel(row.status)} />
                      {row.atRisk ? <Badge tone="danger">At risk</Badge> : null}
                      {row.onTime === true ? <Badge tone="success">On time</Badge> : null}
                      {row.onTime === false ? <Badge tone="warning">Late</Badge> : null}
                    </div>
                  ),
                },
                { key: 'deliveryDate', label: 'Delivery', render: (row) => formatDate(row.deliveryDate) },
                { key: 'completedAt', label: 'Completed', render: (row) => formatDate(row.completedAt) },
                ...(showMoney
                  ? [{ key: 'grandTotal', label: 'Value', align: 'right', render: (row) => formatMoney(row.grandTotal) }]
                  : []),
              ]}
            />
            <p className="text-xs text-slate">Click a row to see that order’s shifts in this range.</p>
          </Section>
        </div>
      ) : null}

      {tab === 'waste' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Floor waste" value={formatQty(data?.kpis?.waste)} hint="Logged when a stage is marked done" tone="warning" />
            <Kpi
              label="Store waste lots"
              value={formatQty(data?.waste?.inventoryTotal)}
              hint={`${data?.waste?.inventory?.length || 0} lots in inventory`}
              tone="accent"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
            <Section title="By stage">
              <BarChart
                data={wasteBars}
                color={CHART_COLORS.waste}
                onBarClick={(row) => openDrill({ type: 'stage', key: row.id, title: `${row.label} waste` })}
              />
            </Section>
            <Section
              title="Inventory lots"
              actions={<SearchField value={wasteQuery} onChange={setWasteQuery} placeholder="Search lot or stage" className="w-48" />}
            >
              <DataTable
                resetKey={wasteQuery}
                empty={<EmptyState title="No waste lots in inventory" />}
                rows={wasteLots}
                columns={[
                  { key: 'name', label: 'Lot' },
                  {
                    key: 'stage',
                    label: 'Stage',
                    render: (row) =>
                      row.stage ? <Badge tone={stepTone(row.stage)}>{stageLabel(row.stage) || row.stage}</Badge> : '—',
                  },
                  {
                    key: 'kind',
                    label: 'Kind',
                    render: (row) => (row.kind === 'wip' ? 'Floor' : 'Catalog'),
                  },
                  {
                    key: 'quantity',
                    label: 'Qty',
                    align: 'right',
                    render: (row) => `${formatQty(row.quantity)} ${row.unit || ''}`.trim(),
                  },
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
            <h2 className="text-lg font-semibold text-ink">{drill?.title || 'Shifts'}</h2>
            <p className="mt-0.5 text-sm text-slate">{drillRows.length} shift{drillRows.length === 1 ? '' : 's'} in this range</p>
          </div>
        }
        onClose={() => setDrill(null)}
      >
        <WorkTable rows={drillRows} canOpenOrder={canOpenOrder} onClose={() => setDrill(null)} />
      </Modal>
    </div>
  );
}
